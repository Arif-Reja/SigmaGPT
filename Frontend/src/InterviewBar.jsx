import "./Scorecard.css";
import { useContext, useEffect, useRef, useState } from "react";
import { MyContext } from "./MyContext.jsx";
import Modal from "./Modal.jsx";
import ScorecardView from "./ScorecardView.jsx";
import { createScorecard, friendlyError } from "./scorecards.js";

// Shows "Finish & get scorecard" while an interview is going on
function InterviewBar() {
    const { mode, prevChats, currThreadId } = useContext(MyContext);

    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [scorecard, setScorecard] = useState(null);

    const abortRef = useRef(null);

    // Opening another chat cancels scoring
    useEffect(() => {
        abortRef.current?.abort();
        abortRef.current = null;

        setGenerating(false);
        setError("");
    }, [currThreadId]);

    useEffect(() => () => abortRef.current?.abort(), []);

    // The first message only starts the interview, so answers = messages - 1
    const userMessages = (prevChats || []).filter(
        (chat) => chat.role === "user"
    ).length;
    const answers = Math.max(userMessages - 1, 0);
    const visible = mode === "interview" && answers >= 1;

    const handleFinish = async () => {
        if (generating) return;

        const controller = new AbortController();
        abortRef.current = controller;

        setGenerating(true);
        setError("");

        try {
            const result = await createScorecard(currThreadId, controller.signal);

            setScorecard(result);
        } catch (err) {
            if (err.name === "AbortError") return;

            setError(friendlyError(err));
        } finally {
            if (abortRef.current === controller) {
                abortRef.current = null;
                setGenerating(false);
            }
        }
    };

    return (
        <>
            {visible && (
                <div className="interviewBar">
                    <div className="interviewBarText">
                        <i className="fa-solid fa-clipboard-check"></i>
                        <span>
                            Mock interview · {answers}{" "}
                            {answers === 1 ? "answer" : "answers"} so far
                        </span>
                    </div>

                    <button
                        type="button"
                        className="interviewBarBtn"
                        onClick={handleFinish}
                        disabled={generating}
                    >
                        {generating ? (
                            <>
                                <span className="scSpinner"></span> Scoring your
                                interview...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-flag-checkered"></i> Finish
                                &amp; get scorecard
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="interviewBarError" role="alert">
                            {error}
                        </div>
                    )}
                </div>
            )}

            {scorecard && (
                <Modal
                    title="Your interview scorecard"
                    onClose={() => setScorecard(null)}
                >
                    <ScorecardView
                        scorecard={scorecard}
                        onClose={() => setScorecard(null)}
                    />
                </Modal>
            )}
        </>
    );
}

export default InterviewBar;