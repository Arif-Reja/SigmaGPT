import "./AuthPage.css";
import SigmaMark from "./SigmaMark.jsx";
import { useState } from "react";
import { loginRequest, registerRequest } from "./auth.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function AuthPage({
    onAuthenticated,
    onBack,
    initialMode = "login",
    notice = ""
}) {
    const [isRegister, setIsRegister] = useState(initialMode === "register");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const switchMode = () => {
        setIsRegister((prev) => !prev);
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (isRegister && !cleanName) {
            setError("Please enter your name.");
            return;
        }

        if (!EMAIL_PATTERN.test(cleanEmail)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (!password) {
            setError("Please enter your password.");
            return;
        }

        if (isRegister && password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = isRegister
                ? await registerRequest(cleanName, cleanEmail, password)
                : await loginRequest(cleanEmail, password);

            onAuthenticated(data);
        } catch (err) {
            setError(
                err instanceof TypeError
                    ? "Cannot reach the server. Check that the backend is running."
                    : err.message || "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="authPage">
            <section className="authCard">
                {onBack && (
                    <button
                        type="button"
                        className="authBack"
                        onClick={onBack}
                    >
                        <i className="fa-solid fa-arrow-left"></i> Back
                    </button>
                )}

                <SigmaMark size={48} className="authMark" />

                <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>

                <p className="authSubtitle">
                    {isRegister
                        ? "Sign up to save your chats and use SigmaGPT."
                        : "Log in to continue with SigmaGPT."}
                </p>

                {notice && !error && (
                    <div className="authNotice" role="alert">
                        {notice}
                    </div>
                )}

                {error && (
                    <div className="authError" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    {isRegister && (
                        <label className="authField">
                            <span>Name</span>
                            <input
                                type="text"
                                value={name}
                                maxLength={50}
                                autoComplete="name"
                                placeholder="Your name"
                                onChange={(e) => setName(e.target.value)}
                            />
                        </label>
                    )}

                    <label className="authField">
                        <span>Email</span>
                        <input
                            type="email"
                            value={email}
                            maxLength={254}
                            autoComplete="email"
                            placeholder="you@example.com"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </label>

                    <label className="authField">
                        <span>Password</span>

                        <div className="passwordWrap">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                maxLength={72}
                                autoComplete={
                                    isRegister
                                        ? "new-password"
                                        : "current-password"
                                }
                                placeholder={
                                    isRegister
                                        ? "At least 8 characters"
                                        : "Your password"
                                }
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <button
                                type="button"
                                className="passwordToggle"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >
                                <i
                                    className={
                                        showPassword
                                            ? "fa-solid fa-eye-slash"
                                            : "fa-solid fa-eye"
                                    }
                                ></i>
                            </button>
                        </div>
                    </label>

                    <button
                        type="submit"
                        className="authSubmit"
                        disabled={loading}
                    >
                        {loading
                            ? "Please wait..."
                            : isRegister
                              ? "Create account"
                              : "Log in"}
                    </button>
                </form>

                <p className="authSwitch">
                    {isRegister
                        ? "Already have an account?"
                        : "New to SigmaGPT?"}{" "}
                    <button type="button" onClick={switchMode}>
                        {isRegister ? "Log in" : "Create an account"}
                    </button>
                </p>
            </section>
        </main>
    );
}

export default AuthPage;