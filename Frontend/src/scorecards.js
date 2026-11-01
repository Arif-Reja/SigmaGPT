import { apiFetch } from "./auth.js";

const request = async (path, options) => {
    const response = await apiFetch(path, options);

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
};

export const createScorecard = async (threadId, signal) => {
    const data = await request("/api/scorecards", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ threadId }),
        signal
    });

    return data.scorecard;
};

export const listScorecards = async () =>
    (await request("/api/scorecards")).scorecards;

export const getScorecard = async (id) =>
    (await request(`/api/scorecards/${encodeURIComponent(id)}`)).scorecard;

export const deleteScorecard = (id) =>
    request(`/api/scorecards/${encodeURIComponent(id)}`, { method: "DELETE" });

export const friendlyError = (err) =>
    err instanceof TypeError
        ? "Cannot reach the server. Check that the backend is running."
        : err.message || "Something went wrong. Please try again.";

export const gradeFor = (overall) => {
    if (overall >= 85) return { label: "Excellent", tone: "good" };
    if (overall >= 70) return { label: "Strong", tone: "good" };
    if (overall >= 55) return { label: "Developing", tone: "mid" };

    return { label: "Needs practice", tone: "low" };
};

export const toneFor10 = (value) => {
    if (value >= 8) return "good";
    if (value >= 6) return "mid";

    return "low";
};

export const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
    });