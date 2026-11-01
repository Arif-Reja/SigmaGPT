import { apiFetch } from "./auth.js";
const LANGUAGES = [
    { key: "java", label: "Java", aliases: ["java"] },
    { key: "python", label: "Python", aliases: ["python", "py", "python3"] },
    {
        key: "javascript",
        label: "JavaScript",
        aliases: ["javascript", "js", "node", "nodejs"]
    },
    { key: "typescript", label: "TypeScript", aliases: ["typescript", "ts"] },
    { key: "c", label: "C", aliases: ["c"] },
    { key: "cpp", label: "C++", aliases: ["cpp", "c++", "cc", "cxx"] },
    { key: "csharp", label: "C#", aliases: ["csharp", "cs", "c#"] },
    { key: "go", label: "Go", aliases: ["go", "golang"] },
    { key: "rust", label: "Rust", aliases: ["rust", "rs"] },
    { key: "kotlin", label: "Kotlin", aliases: ["kotlin", "kt"] },
    { key: "ruby", label: "Ruby", aliases: ["ruby", "rb"] },
    { key: "php", label: "PHP", aliases: ["php"] }
];

const byAlias = new Map();

LANGUAGES.forEach((language) => {
    language.aliases.forEach((alias) => byAlias.set(alias, language));
});

export const getRunLanguage = (className) => {
    const match = /language-([\w+#-]+)/i.exec(className || "");

    return match ? byAlias.get(match[1].toLowerCase()) || null : null;
};

export const runCode = async ({ language, code, stdin, signal }) => {
    const response = await apiFetch("/api/run", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ language, code, stdin }),
        signal
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(data.error || `Could not run the code (${response.status})`);
    }

    return data.result;
};