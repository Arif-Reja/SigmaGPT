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

export const getResume = async () => (await request("/api/resume")).resume;

export const uploadResume = async (file) => {
    const form = new FormData();
    form.append("file", file);

    return (await request("/api/resume/upload", { method: "POST", body: form }))
        .resume;
};
export const saveResumeSettings = async (settings) =>
    (
        await request("/api/resume/settings", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(settings)
        })
    ).resume;

export const removeResumeFile = async () =>
    (await request("/api/resume/file", { method: "DELETE" })).resume;

export const reviewResume = async () =>
    (await request("/api/resume/review", { method: "POST" })).review;