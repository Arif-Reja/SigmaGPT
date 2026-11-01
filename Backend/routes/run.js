import express from "express";

const router = express.Router();

const MAX_CODE_CHARS = 50000;
const MAX_STDIN_CHARS = 10000;
const MAX_OUTPUT_CHARS = 10000;
const MAX_ACTIVE_RUNS = 5;
const REQUEST_TIMEOUT_MS = 10000;
const RUN_DEADLINE_MS = 30000;
const LANGUAGE_CACHE_MS = 60 * 60 * 1000;

const LANGUAGES = {
    java: { label: "Java", match: /^Java \(/i },
    python: { label: "Python", match: /^Python \(3/i },
    javascript: { label: "JavaScript", match: /^JavaScript \(/i },
    typescript: { label: "TypeScript", match: /^TypeScript \(/i },
    c: { label: "C", match: /^C \(GCC/i },
    cpp: { label: "C++", match: /^C\+\+ \(GCC/i },
    csharp: { label: "C#", match: /^C# \(/i },
    go: { label: "Go", match: /^Go \(/i },
    rust: { label: "Rust", match: /^Rust \(/i },
    kotlin: { label: "Kotlin", match: /^Kotlin \(/i },
    ruby: { label: "Ruby", match: /^Ruby \(/i },
    php: { label: "PHP", match: /^PHP \(/i }
};

const RESULT_FIELDS =
    "token,status,stdout,stderr,compile_output,message,time,memory,exit_code";

class RunnerError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.name = "RunnerError";
        this.status = status;
    }
}

let activeRuns = 0;
let languageCache = { ids: null, expires: 0 };

const getConfig = () => {
    const url = (process.env.JUDGE0_URL || "https://ce.judge0.com")
        .trim()
        .replace(/\/+$/, "");

    const headers = { "Content-Type": "application/json" };

    if (process.env.JUDGE0_AUTH_TOKEN) {
        headers["X-Auth-Token"] = process.env.JUDGE0_AUTH_TOKEN;
    }

    if (process.env.JUDGE0_RAPIDAPI_KEY) {
        headers["X-RapidAPI-Key"] = process.env.JUDGE0_RAPIDAPI_KEY;

        try {
            headers["X-RapidAPI-Host"] = new URL(url).host;
        } catch {
            throw new RunnerError("JUDGE0_URL is not a valid web address.", 500);
        }
    }

    return {
        url,
        headers,
        cpuLimit: Number(process.env.JUDGE0_CPU_TIME_LIMIT) || 5,
        wallLimit: Number(process.env.JUDGE0_WALL_TIME_LIMIT) || 10,
        memoryLimitKb: Number(process.env.JUDGE0_MEMORY_LIMIT_KB) || 256000
    };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toBase64 = (text) => Buffer.from(text, "utf8").toString("base64");

const fromBase64 = (value) =>
    typeof value === "string" && value
        ? Buffer.from(value, "base64").toString("utf8")
        : "";

const clip = (text) =>
    text.length > MAX_OUTPUT_CHARS
        ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n... (output shortened)`
        : text;

const judgeFetch = async (path, options = {}) => {
    const { url, headers } = getConfig();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(`${url}${path}`, {
            ...options,
            headers: { ...headers, ...(options.headers || {}) },
            signal: controller.signal
        });
    } catch (err) {
        console.error(
            "Code runner request failed:",
            err.message,
            err.cause?.code || ""
        );

        throw new RunnerError(
            err.name === "AbortError"
                ? "The code runner took too long to respond. Please try again."
                : "Cannot reach the code runner. Check your internet connection and try again.",
            502
        );
    } finally {
        clearTimeout(timer);
    }
};

const failFromResponse = async (response) => {
    let detail = "";

    try {
        detail = (await response.text()).slice(0, 400);
    } catch {
        detail = "";
    }

    console.error(`Code runner error (status ${response.status}):`, detail);

    if (response.status === 429) {
        return new RunnerError(
            "The code runner is busy right now. Please try again in a moment.",
            429
        );
    }

    if (response.status === 401 || response.status === 403) {
        return new RunnerError(
            "The code runner rejected the credentials. Check JUDGE0_AUTH_TOKEN or JUDGE0_RAPIDAPI_KEY in Backend/.env.",
            502
        );
    }

    if (response.status === 422) {
        return new RunnerError(
            "The code runner rejected the settings. Try lowering JUDGE0_MEMORY_LIMIT_KB or JUDGE0_CPU_TIME_LIMIT in Backend/.env.",
            502
        );
    }

    if (response.status >= 500) {
        return new RunnerError(
            "The code runner is having problems right now. Please try again in a moment.",
            502
        );
    }

    return new RunnerError("The code runner could not run this code.", 502);
};

const readJson = async (response) => {
    try {
        return await response.json();
    } catch {
        throw new RunnerError("The code runner sent an unexpected answer.", 502);
    }
};

const loadLanguageIds = async () => {
    if (languageCache.ids && Date.now() < languageCache.expires) {
        return languageCache.ids;
    }

    const response = await judgeFetch("/languages");

    if (!response.ok) {
        throw await failFromResponse(response);
    }

    const list = await readJson(response);

    if (!Array.isArray(list)) {
        throw new RunnerError("The code runner sent an unexpected answer.", 502);
    }

    const ids = {};

    for (const [key, { match }] of Object.entries(LANGUAGES)) {
        const found = list
            .filter(
                (item) => typeof item?.name === "string" && match.test(item.name)
            )
            .sort((a, b) => b.id - a.id)[0];

        if (found) {
            ids[key] = found.id;
        }
    }

    languageCache = { ids, expires: Date.now() + LANGUAGE_CACHE_MS };

    return ids;
};

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const blankOutCommentsAndStrings = (code) =>
    code.replace(
        /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g,
        (match) => " ".repeat(match.length)
    );

const prepareJava = (code) => {
    const withoutPackage = code.replace(/^[ \t]*package\s+[\w.]+\s*;[ \t]*$/m, "");
    const scrubbed = blankOutCommentsAndStrings(withoutPackage);

    const mainIndex = scrubbed.search(/\bpublic\s+static\s+void\s+main\s*\(/);

    if (mainIndex === -1) {
        return withoutPackage;
    }

    const findClose = (open) => {
        let depth = 0;

        for (let i = open; i < scrubbed.length; i++) {
            if (scrubbed[i] === "{") {
                depth++;
            } else if (scrubbed[i] === "}") {
                depth--;

                if (depth === 0) return i;
            }
        }

        return -1;
    };

    let owner = null;
    let ownerOpen = -1;

    for (const found of scrubbed.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)[^{;]*\{/g)) {
        const open = found.index + found[0].length - 1;

        if (open > mainIndex) break;

        if (open > ownerOpen && findClose(open) > mainIndex) {
            owner = found[1];
            ownerOpen = open;
        }
    }

    if (!owner || owner === "Main" || /\bclass\s+Main\b/.test(scrubbed)) {
        return withoutPackage;
    }

    const pattern = new RegExp(`\\b${escapeRegExp(owner)}\\b`, "g");
    let result = "";
    let last = 0;
    let match;

    while ((match = pattern.exec(scrubbed)) !== null) {
        result += withoutPackage.slice(last, match.index) + "Main";
        last = match.index + match[0].length;
    }

    return result + withoutPackage.slice(last);
};

const runSubmission = async ({ languageId, code, stdin }) => {
    const { cpuLimit, wallLimit, memoryLimitKb } = getConfig();

    const body = {
        language_id: languageId,
        source_code: toBase64(code),
        cpu_time_limit: cpuLimit,
        wall_time_limit: wallLimit,
        memory_limit: memoryLimitKb
    };

    if (stdin) {
        body.stdin = toBase64(stdin);
    }

    const submitResponse = await judgeFetch(
        "/submissions?base64_encoded=true&wait=false",
        {
            method: "POST",
            body: JSON.stringify(body)
        }
    );

    if (!submitResponse.ok) {
        throw await failFromResponse(submitResponse);
    }

    const { token } = await readJson(submitResponse);

    if (!token) {
        throw new RunnerError("The code runner sent an unexpected answer.", 502);
    }

    const deadline = Date.now() + RUN_DEADLINE_MS;
    let delay = 500;

    while (Date.now() < deadline) {
        await sleep(delay);
        delay = Math.min(Math.round(delay * 1.3), 2000);

        const pollResponse = await judgeFetch(
            `/submissions/${encodeURIComponent(token)}?base64_encoded=true&fields=${RESULT_FIELDS}`
        );

        if (!pollResponse.ok) {
            throw await failFromResponse(pollResponse);
        }

        const data = await readJson(pollResponse);

        if (data.status && data.status.id > 2) {
            return data;
        }
    }

    throw new RunnerError("The code took too long to finish. Please try again.", 504);
};

router.post("/", async (req, res) => {
    const { language, code, stdin = "" } = req.body || {};

    if (typeof language !== "string" || !LANGUAGES[language]) {
        return res.status(400).json({
            error: "This language cannot be run."
        });
    }

    if (typeof code !== "string" || !code.trim()) {
        return res.status(400).json({
            error: "There is no code to run."
        });
    }

    if (code.length > MAX_CODE_CHARS) {
        return res.status(400).json({
            error: `The code is too long to run (maximum ${MAX_CODE_CHARS} characters).`
        });
    }

    if (typeof stdin !== "string" || stdin.length > MAX_STDIN_CHARS) {
        return res.status(400).json({
            error: `The input is too long (maximum ${MAX_STDIN_CHARS} characters).`
        });
    }

    if (activeRuns >= MAX_ACTIVE_RUNS) {
        return res.status(429).json({
            error: "Many people are running code right now. Please try again in a moment."
        });
    }

    activeRuns += 1;

    try {
        const ids = await loadLanguageIds();
        const languageId = ids[language];

        if (!languageId) {
            return res.status(404).json({
                error: `${LANGUAGES[language].label} is not available on this code runner.`
            });
        }

        const data = await runSubmission({
            languageId,
            code: language === "java" ? prepareJava(code) : code,
            stdin
        });

        return res.status(200).json({
            result: {
                language: LANGUAGES[language].label,
                status: {
                    id: data.status.id,
                    description: data.status.description
                },
                stdout: clip(fromBase64(data.stdout)),
                stderr: clip(fromBase64(data.stderr)),
                compileOutput: clip(fromBase64(data.compile_output)),
                message: clip(fromBase64(data.message)),
                time: data.time ?? null,
                memory: data.memory ?? null,
                exitCode: data.exit_code ?? null
            }
        });
    } catch (err) {
        if (err instanceof RunnerError) {
            return res.status(err.status).json({
                error: err.message
            });
        }

        console.error("Run code error:", err);

        return res.status(500).json({
            error: "Could not run the code. Please try again."
        });
    } finally {
        activeRuns -= 1;
    }
});

export default router;