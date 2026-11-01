import "./RunPanel.css";
import { useEffect, useId, useRef, useState } from "react";
import { runCode } from "./run.js";

const statusKind = (status) => {
    if (status.id === 3) return "ok";
    if (status.id === 5) return "warn";

    return "bad";
};

const statusText = (status) => {
    if (status.id === 3) return "Finished";
    if (status.id === 5) return "Time limit exceeded";
    if (status.id === 6) return "Compilation error";
    if (status.id >= 7 && status.id <= 12) return "Runtime error";

    return status.description || "Could not run";
};

function OutputBlock({ title, text, tone = "" }) {
    return (
        <div className={`runOutput ${tone}`.trim()}>
            <div className="runOutputTitle">{title}</div>
            <pre>{text}</pre>
        </div>
    );
}

function RunPanel({ language, getCode, onClose }) {
    const [stdin, setStdin] = useState("");
    const [showInput, setShowInput] = useState(false);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const abortRef = useRef(null);
    const inputId = useId();

    useEffect(() => () => abortRef.current?.abort(), []);

    const handleRun = async () => {
        if (running) return;

        const code = getCode();

        if (!code.trim()) {
            setError("There is no code to run.");
            return;
        }

        const controller = new AbortController();
        abortRef.current = controller;

        setRunning(true);
        setError("");
        setResult(null);

        try {
            const data = await runCode({
                language: language.key,
                code,
                stdin,
                signal: controller.signal
            });

            setResult(data);
        } catch (err) {
            if (err.name === "AbortError") return;

            setError(
                err instanceof TypeError
                    ? "Cannot reach the server. Check that the backend is running."
                    : err.message || "Could not run the code. Please try again."
            );
        } finally {
            if (abortRef.current === controller) {
                abortRef.current = null;
                setRunning(false);
            }
        }
    };

    const handleStop = () => {
        abortRef.current?.abort();
    };

    const hasOutput =
        result &&
        (result.stdout || result.stderr || result.compileOutput || result.message);

    return (
        <div className="runPanel">
            <div className="runPanelBar">
                <span className="runPanelTitle">
                    <i className="fa-solid fa-terminal"></i> Run {language.label}
                </span>

                <span className="runSpacer"></span>

                <button
                    type="button"
                    className="runTextBtn"
                    onClick={() => setShowInput((prev) => !prev)}
                    aria-expanded={showInput}
                >
                    {showInput ? "Hide input" : "Add input"}
                </button>

                <button
                    type="button"
                    className={running ? "runGo stop" : "runGo"}
                    onClick={running ? handleStop : handleRun}
                >
                    {running ? (
                        <>
                            <i className="fa-solid fa-stop"></i> Stop
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-play"></i> Run
                        </>
                    )}
                </button>

                <button
                    type="button"
                    className="runClose"
                    onClick={onClose}
                    aria-label="Close the run panel"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>

            {showInput && (
                <div className="runInput">
                    <label htmlFor={inputId}>
                        Input for the program (what it reads from the keyboard)
                    </label>

                    <textarea
                        id={inputId}
                        value={stdin}
                        rows={3}
                        maxLength={10000}
                        spellCheck={false}
                        placeholder="Type each input on its own line"
                        onChange={(e) => setStdin(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                e.preventDefault();
                                handleRun();
                            }
                        }}
                    />
                </div>
            )}

            {running && (
                <div className="runStatusLine">
                    <span className="runSpinner"></span>
                    Running... the first run can take a few seconds.
                </div>
            )}

            {error && (
                <div className="runError" role="alert">
                    {error}
                </div>
            )}

            {result && (
                <div className="runResult">
                    <div className="runMeta">
                        <span className={`runBadge ${statusKind(result.status)}`}>
                            {statusText(result.status)}
                        </span>

                        {result.time !== null && <span>{result.time}s</span>}

                        {result.memory !== null && (
                            <span>{(result.memory / 1024).toFixed(1)} MB</span>
                        )}

                        <span className="runSpacer"></span>

                        <button
                            type="button"
                            className="runTextBtn"
                            onClick={() => setResult(null)}
                        >
                            Clear
                        </button>
                    </div>

                    {result.compileOutput && (
                        <OutputBlock
                            title="Compiler output"
                            text={result.compileOutput}
                            tone="error"
                        />
                    )}

                    {result.stdout && (
                        <OutputBlock title="Output" text={result.stdout} />
                    )}

                    {result.stderr && (
                        <OutputBlock
                            title="Errors"
                            text={result.stderr}
                            tone="error"
                        />
                    )}

                    {result.message && (
                        <OutputBlock
                            title="Message"
                            text={result.message}
                            tone="error"
                        />
                    )}

                    {!hasOutput && (
                        <div className="runEmpty">
                            The program finished without printing anything.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default RunPanel;