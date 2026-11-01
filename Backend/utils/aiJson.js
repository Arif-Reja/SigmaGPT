const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 60000;
export class AIJsonError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.name = "AIJsonError";
        this.status = status;
    }
}

const send = async ({ system, user, maxTokens, useJsonMode }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
                model: process.env.OPENROUTER_MODEL || "openai/gpt-4o",
                max_tokens: maxTokens,
                temperature: 0.3,
                ...(useJsonMode
                    ? { response_format: { type: "json_object" } }
                    : {}),
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user }
                ]
            }),
            signal: controller.signal
        });
    } catch (err) {
        console.error("AI request failed:", err.message, err.cause?.code || "");

        throw new AIJsonError(
            err.name === "AbortError"
                ? "The AI took too long to answer. Please try again."
                : "Cannot reach OpenRouter from the server. Check your internet connection and try again."
        );
    } finally {
        clearTimeout(timer);
    }
};

const httpError = async (response, tokenSetting) => {
    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    console.error(`AI error (status ${response.status}):`, JSON.stringify(data));

    if (response.status === 401) {
        return new AIJsonError(
            "The OpenRouter API key is invalid or missing. Check OPENROUTER_API_KEY in Backend/.env."
        );
    }

    if (response.status === 402) {
        return new AIJsonError(
            `Not enough OpenRouter credits. Add credits, or lower ${tokenSetting} in Backend/.env.`
        );
    }

    if (response.status === 404) {
        return new AIJsonError(
            "The AI model was not found. Check OPENROUTER_MODEL in Backend/.env."
        );
    }

    if (response.status === 429) {
        return new AIJsonError(
            "The AI service is busy or rate limited. Wait a moment and try again.",
            429
        );
    }

    if (response.status >= 500) {
        return new AIJsonError(
            "The AI provider is having problems right now. Please try again in a moment."
        );
    }

    return new AIJsonError(
        data.error?.message
            ? `OpenRouter said: ${data.error.message}`
            : "The AI request failed. Please try again."
    );
};

const extractJson = (text) => {
    const cleaned = text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

    try {
        return JSON.parse(cleaned);
    } catch {
       
    }

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end > start) {
        try {
            return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
            return null;
        }
    }

    return null;
};

export const requestJson = async ({
    system,
    user,
    maxTokens = 1500,
    tokenSetting = "the token limit"
}) => {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new AIJsonError(
            "The OpenRouter API key is missing. Add OPENROUTER_API_KEY to Backend/.env.",
            500
        );
    }

    let response = await send({ system, user, maxTokens, useJsonMode: true });

    if (response.status === 400) {
        response = await send({ system, user, maxTokens, useJsonMode: false });
    }

    if (!response.ok) {
        throw await httpError(response, tokenSetting);
    }

    let data;

    try {
        data = await response.json();
    } catch {
        throw new AIJsonError("OpenRouter returned an invalid response.");
    }

    const choice = data.choices?.[0];
    const text = choice?.message?.content;
    const parsed = typeof text === "string" ? extractJson(text) : null;

    if (!parsed || typeof parsed !== "object") {
        throw new AIJsonError(
            choice?.finish_reason === "length"
                ? `The answer was cut off. Raise ${tokenSetting} in Backend/.env and try again.`
                : "The AI did not return a usable answer. Please try again."
        );
    }

    return parsed;
};