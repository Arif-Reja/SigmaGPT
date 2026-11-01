export const API_URL = import.meta.env.VITE_API_URL || "https://sigma-gpt-rrnp.vercel.app";

const TOKEN_KEY = "sigmaGPT_token";
export const UNAUTHORIZED_EVENT = "sigmaGPT:unauthorized";

export const getToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

export const saveToken = (token) => {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch (err) {
        console.warn("Could not save the login:", err);
    }
};

export const clearToken = () => {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch (err) {
        console.warn("Could not clear the login:", err);
    }
};
export const apiFetch = async (path, options = {}) => {
    const token = getToken();
    const headers = { ...(options.headers || {}) };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });
    if (response.status === 401 && token && getToken() === token) {
        clearToken();
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    return response;
};

const authRequest = async (path, body) => {
    const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

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

export const loginRequest = (email, password) =>
    authRequest("/api/auth/login", { email, password });

export const registerRequest = (name, email, password) =>
    authRequest("/api/auth/register", { name, email, password });