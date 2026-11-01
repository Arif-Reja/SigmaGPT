import "./Scorecard.css";
import "./Resume.css";
import { useContext, useId, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { MyContext } from "./MyContext.jsx";
import { formatDate, friendlyError } from "./scorecards.js";
import { formatSize } from "./files.js";
import {
    removeResumeFile,
    reviewResume,
    saveResumeSettings,
    uploadResume
} from "./resume.js";

const ACCEPT = ".pdf,.docx,.txt,.md";
const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt", "md"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROLE_CHARS = 100;
const MAX_JOB_CHARS = 6000;

function ResumeSetup({ resume, onChange, onClose }) {
    const {
        setCurrThreadId,
        setPrevChats,
        setReply,
        setNewChat,
        setMode,
        setPrompt
    } = useContext(MyContext);

    const [role, setRole] = useState(resume?.targetRole || "");
    const [job, setJob] = useState(resume?.jobDescription || "");
    const [view, setView] = useState("setup"); // "setup" or "review"
    const [review, setReview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState("");

    const fileInputRef = useRef(null);
    const roleId = useId();
    const jobId = useId();

    const hasResume = Boolean(resume?.hasResume);
    const enabled = resume ? resume.enabled : true;
    const dirty =
        role.trim() !== (resume?.targetRole || "") ||
        job.trim() !== (resume?.jobDescription || "");
    const busy = uploading || saving || reviewing;
    const canStart = hasResume || Boolean(role.trim()) || Boolean(job.trim());

    const handleFile = async (file) => {
        if (!file || busy) return;

        const extension = (/\.([a-z0-9]+)$/i.exec(file.name)?.[1] || "").toLowerCase();

        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            setError("Please choose a PDF, Word (.docx) or text file.");
            return;
        }

        if (file.size === 0) {
            setError("This file is empty.");
            return;
        }

        if (file.size > MAX_BYTES) {
            setError("The file is too large (maximum 5 MB).");
            return;
        }

        setUploading(true);
        setError("");

        try {
            onChange(await uploadResume(file));
        } catch (err) {
            setError(friendlyError(err));
        } finally {
            setUploading(false);
        }
    };

    const saveDetails = async () => {
        const saved = await saveResumeSettings({
            targetRole: role.trim(),
            jobDescription: job.trim()
        });

        onChange(saved);

        return saved;
    };

    const handleSave = async () => {
        if (busy || !dirty) return;

        setSaving(true);
        setError("");

        try {
            await saveDetails();
        } catch (err) {
            setError(friendlyError(err));
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (checked) => {
        setError("");

        try {
            onChange(await saveResumeSettings({ enabled: checked }));
        } catch (err) {
            setError(friendlyError(err));
        }
    };

    const handleRemove = async () => {
        if (
            busy ||
            !window.confirm("Remove your resume? Your target role and job description stay.")
        ) {
            return;
        }

        setError("");

        try {
            onChange(await removeResumeFile());
        } catch (err) {
            setError(friendlyError(err));
        }
    };

    const handleReview = async () => {
        if (busy || !hasResume) return;

        setReviewing(true);
        setError("");

        try {
            if (dirty) {
                await saveDetails();
            }

            setReview(await reviewResume());
            setView("review");
        } catch (err) {
            setError(friendlyError(err));
        } finally {
            setReviewing(false);
        }
    };

    const startInterview = async () => {
        if (busy) return;

        setError("");

        try {
            let current = resume;

            if (dirty) {
                current = await saveDetails();
            }

            if (!current?.enabled) {
                onChange(await saveResumeSettings({ enabled: true }));
            }

            setCurrThreadId(uuidv4());
            setPrevChats([]);
            setReply(null);
            setNewChat(true);
            setMode("interview");
            setPrompt(
                hasResume
                    ? "Start a mock interview based on my resume."
                    : "Start a mock interview for the role I described."
            );

            onClose();
        } catch (err) {
            setError(friendlyError(err));
        }
    };

    if (view === "review" && review) {
        return (
            <div className="scorecard">
                <div className="scTopBar">
                    <button
                        type="button"
                        className="scBack"
                        onClick={() => setView("setup")}
                    >
                        <i className="fa-solid fa-arrow-left"></i> Back to setup
                    </button>
                </div>

                <section className="scSection" style={{ marginTop: 0 }}>
                    <h4>Summary</h4>
                    <p className="scSummary">{review.summary}</p>
                </section>

                {review.strengths.length > 0 && (
                    <section className="scSection">
                        <h4>Strengths</h4>

                        <ul className="scList good">
                            {review.strengths.map((item, index) => (
                                <li key={`${index}-${item}`}>
                                    <i className="fa-solid fa-circle-check"></i>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {review.improvements.length > 0 && (
                    <section className="scSection">
                        <h4>What to improve</h4>

                        <ul className="scList warn">
                            {review.improvements.map((item, index) => (
                                <li key={`${index}-${item}`}>
                                    <i className="fa-solid fa-triangle-exclamation"></i>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {review.missingKeywords.length > 0 && (
                    <section className="scSection">
                        <h4>
                            Keywords from the job that your resume does not clearly show
                        </h4>

                        <div className="rsChips">
                            {review.missingKeywords.map((keyword) => (
                                <span key={keyword}>{keyword}</span>
                            ))}
                        </div>
                    </section>
                )}

                {review.rewrites.length > 0 && (
                    <section className="scSection">
                        <h4>Stronger bullet points</h4>

                        {review.rewrites.map((item, index) => (
                            <div className="rsRewrite" key={`${index}-${item.before}`}>
                                <div className="rsBefore">
                                    <span>Before</span>
                                    <p>{item.before}</p>
                                </div>

                                <div className="rsAfter">
                                    <span>After</span>
                                    <p>{item.after}</p>
                                </div>

                                {item.why && <small>{item.why}</small>}
                            </div>
                        ))}

                        <p className="rsHint">
                            Replace anything in [brackets] with your real numbers.
                            Only use facts that are true for you.
                        </p>
                    </section>
                )}

                {review.likelyQuestions.length > 0 && (
                    <section className="scSection">
                        <h4>Questions you may be asked</h4>

                        <ol className="rsQuestions">
                            {review.likelyQuestions.map((item, index) => (
                                <li key={`${index}-${item}`}>{item}</li>
                            ))}
                        </ol>
                    </section>
                )}

                <div className="rsActions">
                    <button
                        type="button"
                        className="rsPrimary"
                        onClick={startInterview}
                    >
                        <i className="fa-solid fa-microphone-lines"></i> Practice
                        these in an interview
                    </button>
                </div>

                {error && (
                    <div className="scError" role="alert">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    // ===== Setup view =====
    return (
        <div className="rsSetup">
            {error && (
                <div className="scError" role="alert">
                    {error}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                hidden
                accept={ACCEPT}
                onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = "";
                }}
            />

            <section className="rsSection">
                <h4>Your resume</h4>

                {hasResume ? (
                    <div className="rsFile">
                        <div className="rsFileTop">
                            <i className="fa-solid fa-file-lines"></i>

                            <div className="rsFileInfo">
                                <strong>{resume.fileName}</strong>
                                <small>
                                    {formatSize(resume.size)} · {resume.textChars.toLocaleString()}{" "}
                                    characters read · {formatDate(resume.updatedAt)}
                                </small>
                            </div>

                            <button
                                type="button"
                                className="rsLink"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={busy}
                            >
                                {uploading ? "Uploading..." : "Replace"}
                            </button>

                            <button
                                type="button"
                                className="rsLink danger"
                                onClick={handleRemove}
                                disabled={busy}
                            >
                                Remove
                            </button>
                        </div>

                        {resume.truncated && (
                            <p className="rsHint">
                                This resume is long, so only the first 30,000 characters
                                were kept.
                            </p>
                        )}

                        {resume.preview && (
                            <details className="rsPreview">
                                <summary>Check what was read from the file</summary>
                                <pre>
                                    {resume.preview}
                                    {resume.textChars > resume.preview.length ? "…" : ""}
                                </pre>
                            </details>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        className={dragging ? "rsDrop dragging" : "rsDrop"}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragging(false);
                            handleFile(e.dataTransfer.files?.[0]);
                        }}
                        disabled={uploading}
                    >
                        <i
                            className={
                                uploading
                                    ? "fa-solid fa-spinner fa-spin"
                                    : "fa-solid fa-cloud-arrow-up"
                            }
                        ></i>

                        <strong>
                            {uploading
                                ? "Reading your resume..."
                                : "Click to upload, or drop a file here"}
                        </strong>

                        <span>PDF, Word (.docx) or text, up to 5 MB</span>
                    </button>
                )}
            </section>

            <section className="rsSection">
                <h4>Target job (optional)</h4>

                <label className="rsField" htmlFor={roleId}>
                    <span>Role</span>
                    <input
                        id={roleId}
                        type="text"
                        value={role}
                        maxLength={MAX_ROLE_CHARS}
                        placeholder="For example: Java Backend Developer"
                        onChange={(e) => setRole(e.target.value)}
                    />
                </label>

                <label className="rsField" htmlFor={jobId}>
                    <span>Job description</span>
                    <textarea
                        id={jobId}
                        value={job}
                        rows={6}
                        maxLength={MAX_JOB_CHARS}
                        placeholder="Paste the job posting here"
                        onChange={(e) => setJob(e.target.value)}
                    />
                    <small className="rsCount">
                        {job.length.toLocaleString()} / {MAX_JOB_CHARS.toLocaleString()}
                    </small>
                </label>
            </section>

            {resume && (hasResume || resume.targetRole || resume.jobDescription) && (
                <label className="rsCheck">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => handleToggle(e.target.checked)}
                    />
                    <span>Use this in my interviews</span>
                </label>
            )}

            <div className="rsActions">
                <button
                    type="button"
                    className="rsPrimary"
                    onClick={startInterview}
                    disabled={busy || !canStart}
                >
                    <i className="fa-solid fa-microphone-lines"></i> Start interview
                </button>

                <button
                    type="button"
                    className="rsSecondary"
                    onClick={handleReview}
                    disabled={busy || !hasResume}
                    title={hasResume ? "" : "Upload a resume first"}
                >
                    {reviewing ? (
                        <>
                            <span className="scSpinner"></span> Reviewing...
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-wand-magic-sparkles"></i> Get
                            resume feedback
                        </>
                    )}
                </button>

                <button
                    type="button"
                    className="rsSecondary"
                    onClick={handleSave}
                    disabled={busy || !dirty}
                >
                    {saving ? "Saving..." : "Save details"}
                </button>
            </div>

            <p className="rsHint">
                Your resume is saved to your account and sent to the AI provider
                when you use it. Remove it any time.
            </p>
        </div>
    );
}

export default ResumeSetup;