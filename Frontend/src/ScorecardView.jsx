import "./Scorecard.css";
import { useContext, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { MyContext } from "./MyContext.jsx";
import { formatDate, gradeFor, toneFor10 } from "./scorecards.js";
import {
    getVoiceLang,
    isSynthesisSupported,
    speak,
    stopSpeaking,
    useSpeakingId
} from "./voice.js";

const SKILLS = [
    {
        key: "correctness",
        label: "Correctness",
        hint: "Are the facts and solutions right?"
    },
    {
        key: "communication",
        label: "Communication",
        hint: "Is the answer clear and well structured?"
    },
    {
        key: "depth",
        label: "Depth",
        hint: "Edge cases, complexity and trade-offs"
    }
];

const buildSpokenSummary = (scorecard) =>
    [
        `Your interview score is ${scorecard.overall} out of 100.`,
        scorecard.summary,
        scorecard.strengths?.length
            ? `Strengths: ${scorecard.strengths.join(". ")}.`
            : "",
        scorecard.weakSpots?.length
            ? `Areas to improve: ${scorecard.weakSpots.join(". ")}.`
            : "",
        scorecard.studyNext?.length
            ? `Study next: ${scorecard.studyNext.map((item) => item.topic).join(", ")}.`
            : ""
    ]
        .filter(Boolean)
        .join(" ");

function ScorecardView({ scorecard, onClose }) {
    const {
        setCurrThreadId,
        setNewChat,
        setPrevChats,
        setReply,
        setPrompt,
        setMode
    } = useContext(MyContext);

    const [showQuestions, setShowQuestions] = useState(false);

    const speakingId = useSpeakingId();
    const speechId = `scorecard:${scorecard.id}`;
    const isSpeaking = speakingId === speechId;

    const isSpeakingRef = useRef(false);
    isSpeakingRef.current = isSpeaking;

    useEffect(
        () => () => {
            if (isSpeakingRef.current) {
                stopSpeaking();
            }
        },
        []
    );

    const handleListen = () => {
        if (isSpeaking) {
            stopSpeaking();
            return;
        }

        speak(buildSpokenSummary(scorecard), {
            id: speechId,
            lang: getVoiceLang()
        });
    };

    const startPractice = (topic) => {
        stopSpeaking();

        setCurrThreadId(uuidv4());
        setPrevChats([]);
        setReply(null);
        setNewChat(true);
        setMode("practice");
        setPrompt(`Help me practice: ${topic}`);

        onClose?.();
    };

    const grade = gradeFor(scorecard.overall);
    const strengths = scorecard.strengths || [];
    const weakSpots = scorecard.weakSpots || [];
    const studyNext = scorecard.studyNext || [];
    const questions = scorecard.questions || [];

    return (
        <div className="scorecard">
            <header className="scHeader">
                <div
                    className={`scRing ${grade.tone}`}
                    style={{ "--pct": scorecard.overall }}
                    role="img"
                    aria-label={`Overall score ${scorecard.overall} out of 100`}
                >
                    <strong>{scorecard.overall}</strong>
                    <span>/100</span>
                </div>

                <div className="scHeaderText">
                    <span className={`scGrade ${grade.tone}`}>{grade.label}</span>

                    <h3>{scorecard.topic}</h3>

                    <p className="scMeta">
                        {formatDate(scorecard.date)} · {scorecard.answeredCount}{" "}
                        {scorecard.answeredCount === 1 ? "answer" : "answers"} scored
                    </p>
                </div>
            </header>

            <section className="scSection">
                <h4>Skill scores</h4>

                {SKILLS.map((skill) => {
                    const value = scorecard.scores[skill.key];

                    return (
                        <div className="scBarRow" key={skill.key}>
                            <div className="scBarLabel">
                                <span>{skill.label}</span>
                                <strong>{value}/10</strong>
                            </div>

                            <div
                                className="scBar"
                                role="img"
                                aria-label={`${skill.label}: ${value} out of 10`}
                            >
                                <span
                                    className={toneFor10(value)}
                                    style={{ width: `${value * 10}%` }}
                                ></span>
                            </div>

                            <small>{skill.hint}</small>
                        </div>
                    );
                })}
            </section>

            <section className="scSection">
                <h4>Summary</h4>
                <p className="scSummary">{scorecard.summary}</p>
            </section>

            {strengths.length > 0 && (
                <section className="scSection">
                    <h4>Strengths</h4>

                    <ul className="scList good">
                        {strengths.map((item, index) => (
                            <li key={`${index}-${item}`}>
                                <i className="fa-solid fa-circle-check"></i>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {weakSpots.length > 0 && (
                <section className="scSection">
                    <h4>Weak spots</h4>

                    <ul className="scList warn">
                        {weakSpots.map((item, index) => (
                            <li key={`${index}-${item}`}>
                                <i className="fa-solid fa-triangle-exclamation"></i>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {studyNext.length > 0 && (
                <section className="scSection">
                    <h4>Study next</h4>

                    <ul className="scStudy">
                        {studyNext.map((item, index) => (
                            <li className="scStudyItem" key={`${index}-${item.topic}`}>
                                <div>
                                    <strong>{item.topic}</strong>
                                    {item.why && <p>{item.why}</p>}
                                </div>

                                <button
                                    type="button"
                                    className="scPracticeBtn"
                                    onClick={() => startPractice(item.topic)}
                                >
                                    Practice
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {questions.length > 0 && (
                <section className="scSection">
                    <button
                        type="button"
                        className="scToggle"
                        onClick={() => setShowQuestions((open) => !open)}
                        aria-expanded={showQuestions}
                    >
                        <i
                            className={
                                showQuestions
                                    ? "fa-solid fa-chevron-down"
                                    : "fa-solid fa-chevron-right"
                            }
                        ></i>
                        Question-by-question feedback ({questions.length})
                    </button>

                    {showQuestions && (
                        <ol className="scQuestions">
                            {questions.map((item, index) => (
                                <li key={`${index}-${item.question}`}>
                                    <div className="scQuestionHead">
                                        <span>{item.question}</span>

                                        <span
                                            className={`scBadge ${toneFor10(item.score)}`}
                                        >
                                            {item.score}/10
                                        </span>
                                    </div>

                                    {item.feedback && <p>{item.feedback}</p>}
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            )}

            {isSynthesisSupported && (
                <div className="scActions">
                    <button type="button" className="scListenBtn" onClick={handleListen}>
                        <i
                            className={
                                isSpeaking
                                    ? "fa-solid fa-stop"
                                    : "fa-solid fa-volume-high"
                            }
                        ></i>
                        {isSpeaking ? "Stop" : "Listen to feedback"}
                    </button>
                </div>
            )}
        </div>
    );
}

export default ScorecardView;