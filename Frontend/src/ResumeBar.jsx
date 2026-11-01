import "./Resume.css";
import { useContext, useEffect, useState } from "react";
import { MyContext } from "./MyContext.jsx";
import Modal from "./Modal.jsx";
import ResumeSetup from "./ResumeSetup.jsx";
import { friendlyError } from "./scorecards.js";
import { getResume, saveResumeSettings } from "./resume.js";

function ResumeBar() {
    const { mode, prevChats, setPrompt } = useContext(MyContext);

    const [resume, setResume] = useState(undefined); 
    const [open, setOpen] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (mode !== "interview" || resume !== undefined) return;

        let cancelled = false;

        getResume()
            .then((saved) => {
                if (!cancelled) setResume(saved);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(friendlyError(err));
                    setResume(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [mode, resume]);

    if (mode !== "interview" || resume === undefined) {
        return null;
    }

    const configured =
        resume && (resume.hasResume || resume.targetRole || resume.jobDescription);
    const chatIsEmpty = (prevChats || []).length === 0;

    const handleToggle = async () => {
        setError("");

        try {
            setResume(await saveResumeSettings({ enabled: !resume.enabled }));
        } catch (err) {
            setError(friendlyError(err));
        }
    };

    const summary =
        [resume?.fileName, resume?.targetRole].filter(Boolean).join(" · ") ||
        "Job description added";

    return (
        <>
            <div className="resumeBar">
                {configured ? (
                    <>
                        <div className="resumeBarMain">
                            <i className="fa-solid fa-user-tie"></i>
                            <span className="resumeBarTitle">
                                Personalized interview
                            </span>
                            <span className="resumeBarMeta" title={summary}>
                                {summary}
                            </span>
                        </div>

                        <label className="resumeSwitch">
                            <input
                                type="checkbox"
                                role="switch"
                                checked={resume.enabled}
                                onChange={handleToggle}
                            />
                            <span className="resumeSlider"></span>
                            <span>{resume.enabled ? "On" : "Off"}</span>
                        </label>

                        {chatIsEmpty && resume.enabled && (
                            <button
                                type="button"
                                className="resumeBtn"
                                onClick={() =>
                                    setPrompt(
                                        resume.hasResume
                                            ? "Start a mock interview based on my resume."
                                            : "Start a mock interview for the role I described."
                                    )
                                }
                            >
                                Use starter message
                            </button>
                        )}

                        <button
                            type="button"
                            className="resumeBtn"
                            onClick={() => setOpen(true)}
                        >
                            Edit
                        </button>
                    </>
                ) : (
                    <>
                        <div className="resumeBarMain">
                            <i className="fa-solid fa-user-tie"></i>
                            <span className="resumeBarTitle">Make it personal</span>
                            <span className="resumeBarMeta">
                                Add your resume or a job description and the
                                interviewer will ask about your own projects.
                            </span>
                        </div>

                        <button
                            type="button"
                            className="resumeBtn primary"
                            onClick={() => setOpen(true)}
                        >
                            Set up
                        </button>
                    </>
                )}

                {error && (
                    <div className="resumeBarError" role="alert">
                        {error}
                    </div>
                )}
            </div>

            {open && (
                <Modal
                    title="Interview setup"
                    onClose={() => setOpen(false)}
                    wide
                >
                    <ResumeSetup
                        resume={resume}
                        onChange={setResume}
                        onClose={() => setOpen(false)}
                    />
                </Modal>
            )}
        </>
    );
}

export default ResumeBar;