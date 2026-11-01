import "./Dsa.css";
import hljs from "highlight.js/lib/core";
import java from "highlight.js/lib/languages/java";
import { useContext, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { MyContext } from "./MyContext.jsx";
import Visualizer from "./Visualizer.jsx";
import RunPanel from "./RunPanel.jsx";
import StackQueueViz from "./StackQueueViz.jsx";
import LinkedListViz from "./LinkedListViz.jsx";
import HashTableViz from "./HashTableViz.jsx";
import TreeViz from "./TreeViz.jsx";
import GraphViz from "./GraphViz.jsx";
import DpViz from "./DpViz.jsx";
import { LEVELS, TOPICS } from "./dsaTopics.js";

hljs.registerLanguage("java", java);

const PROGRESS_PREFIX = "sigmaGPT_dsa_";
const TOPIC_KEY = "sigmaGPT_dsa_topic";

const TABS = [
    { key: "learn", label: "Learn", icon: "fa-solid fa-book-open" },
    { key: "visualize", label: "Visualize", icon: "fa-solid fa-play" },
    { key: "code", label: "Code", icon: "fa-solid fa-code" },
    { key: "practice", label: "Practice", icon: "fa-solid fa-dumbbell" },
    { key: "quiz", label: "Quiz", icon: "fa-solid fa-circle-question" }
];

const JAVA = { key: "java", label: "Java" };

const readProgress = (key) => {
    try {
        const saved = JSON.parse(localStorage.getItem(key));

        return { done: saved?.done || {}, best: saved?.best || {} };
    } catch {
        return { done: {}, best: {} };
    }
};

const writeProgress = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
    }
};

const readLastTopic = () => {
    try {
        const saved = localStorage.getItem(TOPIC_KEY);

        return TOPICS.some((topic) => topic.id === saved) ? saved : TOPICS[0].id;
    } catch {
        return TOPICS[0].id;
    }
};


function LearnTab({ topic }) {
    const hasSpace = topic.algorithms.some((item) => item.space);

    return (
        <div className="dsaContent">
            <p className="dsaSummary">{topic.summary}</p>

            <section className="dsaSection">
                <h3>Key ideas</h3>

                <ul className="dsaBullets">
                    {topic.ideas.map((idea) => (
                        <li key={idea}>{idea}</li>
                    ))}
                </ul>
            </section>

            <section className="dsaSection">
                <h3>{topic.tableTitle}</h3>

                <div className="dsaTableWrap">
                    <table className="dsaTable">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Time</th>
                                {hasSpace && <th>Space</th>}
                                <th>Good to know</th>
                            </tr>
                        </thead>

                        <tbody>
                            {topic.algorithms.map((item) => (
                                <tr key={item.name}>
                                    <td>{item.name}</td>
                                    <td>{item.time}</td>
                                    {hasSpace && <td>{item.space || "–"}</td>}
                                    <td>{item.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="dsaSection">
                <h3>When to use it</h3>

                <ul className="dsaBullets">
                    {topic.whenToUse.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </section>

            <div className="dsaTip">
                <i className="fa-solid fa-lightbulb"></i>

                <div>
                    <strong>Interview tip</strong>
                    <p>{topic.tip}</p>
                </div>
            </div>
        </div>
    );
}

function VisualizeTab({ topic, ask }) {
    switch (topic.viz) {
        case "array":
            return (
                <Visualizer
                    key={topic.id}
                    initialAlgorithm={topic.vizStart}
                    onAsk={(text) => ask(text, "learn")}
                />
            );
        case "stackqueue":
            return <StackQueueViz />;
        case "linkedlist":
            return <LinkedListViz />;
        case "hash":
            return <HashTableViz />;
        case "tree":
            return <TreeViz />;
        case "graph":
            return <GraphViz />;
        case "dp":
            return <DpViz />;
        default:
            return null;
    }
}

function CodeTab({ topic }) {
    const [running, setRunning] = useState(false);
    const [copied, setCopied] = useState(false);

    const html = hljs.highlight(topic.code.java, { language: "java" }).value;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(topic.code.java);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error("Copy failed:", err);
        }
    };

    return (
        <div className="dsaContent">
            <div className="dsaCodeBar">
                <strong>{topic.code.title}</strong>

                <span className="dsaSpacer"></span>

                <button type="button" className="dsBtn" onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy"}
                </button>

                <button
                    type="button"
                    className="dsBtn primary"
                    onClick={() => setRunning((open) => !open)}
                    aria-expanded={running}
                >
                    <i className="fa-solid fa-play"></i> Run
                </button>
            </div>

            <pre className="dsaCode">
                <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
            </pre>

            {running && (
                <RunPanel
                    language={JAVA}
                    getCode={() => topic.code.java}
                    onClose={() => setRunning(false)}
                />
            )}

            <p className="dsNote">
                Change the code and press Run to experiment. Copy it into the chat if you want SigmaGPT to review
                your version.
            </p>
        </div>
    );
}

function PracticeTab({ topic, ask }) {
    return (
        <div className="dsaContent">
            <p className="dsaSummary">
                Classic interview problems for this topic. SigmaGPT will coach you with hints instead of giving the
                solution away.
            </p>

            <ul className="dsaProblems">
                {topic.problems.map((problem) => (
                    <li key={problem.name} className="dsaProblem">
                        <div className="dsaProblemText">
                            <div className="dsaProblemTitle">
                                <strong>{problem.name}</strong>

                                <span className={`dsaLevel ${problem.level.toLowerCase()}`}>
                                    {problem.level}
                                </span>
                            </div>

                            <p>Idea: {problem.idea}</p>
                        </div>

                        <button
                            type="button"
                            className="dsBtn primary"
                            onClick={() =>
                                ask(
                                    `I want to practice the problem "${problem.name}". Give me hints, not the full solution. Start by asking what approach I am thinking of.`,
                                    "practice"
                                )
                            }
                        >
                            Practice with SigmaGPT
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function QuizTab({ topic, best, onFinish }) {
    const questions = topic.quiz;

    const [index, setIndex] = useState(0);
    const [picked, setPicked] = useState(null);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);

    const question = questions[index];

    const choose = (option) => {
        if (picked !== null) return;

        setPicked(option);

        if (option === question.answer) {
            setScore((value) => value + 1);
        }
    };

    const next = () => {
        if (index + 1 >= questions.length) {
            setFinished(true);
            onFinish(score);
            return;
        }

        setIndex(index + 1);
        setPicked(null);
    };

    const restart = () => {
        setIndex(0);
        setPicked(null);
        setScore(0);
        setFinished(false);
    };

    if (finished) {
        return (
            <div className="dsaContent">
                <div className="dsaQuizDone">
                    <strong>
                        {score} / {questions.length}
                    </strong>

                    <p>
                        {score === questions.length
                            ? "Perfect score! You can mark this topic as completed."
                            : "Good effort. Read the Learn tab again and retry to improve your score."}
                    </p>

                    <button type="button" className="dsBtn primary" onClick={restart}>
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dsaContent">
            <div className="dsaQuizHead">
                <span>
                    Question {index + 1} of {questions.length}
                </span>

                {best !== undefined && (
                    <span>
                        Best score: {best} / {questions.length}
                    </span>
                )}
            </div>

            <h3 className="dsaQuestion">{question.q}</h3>

            <div className="dsaOptions">
                {question.options.map((text, option) => {
                    let state = "";

                    if (picked !== null) {
                        if (option === question.answer) state = "correct";
                        else if (option === picked) state = "wrong";
                    }

                    return (
                        <button
                            type="button"
                            key={text}
                            className={`dsaOption ${state}`.trim()}
                            onClick={() => choose(option)}
                            disabled={picked !== null}
                        >
                            {text}
                        </button>
                    );
                })}
            </div>

            {picked !== null && (
                <div className="dsaWhy" role="status">
                    <strong>{picked === question.answer ? "Correct!" : "Not quite."}</strong> {question.why}

                    <div>
                        <button type="button" className="dsBtn primary" onClick={next}>
                            {index + 1 >= questions.length ? "See my score" : "Next question"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}


function DsaPage() {
    const {
        user,
        setView,
        setCurrThreadId,
        setPrevChats,
        setReply,
        setNewChat,
        setMode,
        setPrompt
    } = useContext(MyContext);

    const storageKey = `${PROGRESS_PREFIX}${user?.id || "guest"}`;

    const [progress, setProgress] = useState(() => readProgress(storageKey));
    const [topicId, setTopicId] = useState(readLastTopic);
    const [tab, setTab] = useState("learn");
    const [search, setSearch] = useState("");
    const [level, setLevel] = useState("All");

    const topicIndex = Math.max(
        TOPICS.findIndex((item) => item.id === topicId),
        0
    );
    const topic = TOPICS[topicIndex];
    const nextTopic = TOPICS[topicIndex + 1];

    const doneCount = TOPICS.filter((item) => progress.done[item.id]).length;
    const percent = Math.round((doneCount / TOPICS.length) * 100);

    const updateProgress = (change) =>
        setProgress((prev) => {
            const next = change(prev);

            writeProgress(storageKey, next);

            return next;
        });

    const toggleDone = (id) =>
        updateProgress((prev) => ({
            ...prev,
            done: { ...prev.done, [id]: !prev.done[id] }
        }));

    const saveBest = (id, score) =>
        updateProgress((prev) =>
            score > (prev.best[id] ?? -1)
                ? { ...prev, best: { ...prev.best, [id]: score } }
                : prev
        );

    const selectTopic = (id) => {
        setTopicId(id);
        setTab("learn");

        try {
            localStorage.setItem(TOPIC_KEY, id);
        } catch {
        }
    };

    const ask = (text, mode) => {
        setCurrThreadId(uuidv4());
        setPrevChats([]);
        setReply(null);
        setNewChat(true);
        setMode(mode);
        setPrompt(text);
        setView("chat");
    };

    const query = search.trim().toLowerCase();

    const visible = TOPICS.filter((item) => {
        const levelOk = level === "All" || item.level === level;
        const textOk =
            !query ||
            [item.title, item.summary, ...item.algorithms.map((entry) => entry.name)]
                .join(" ")
                .toLowerCase()
                .includes(query);

        return levelOk && textOk;
    });

    const groups = [];

    visible.forEach((item) => {
        const group = groups.find((entry) => entry.name === item.category);

        if (group) group.items.push(item);
        else groups.push({ name: item.category, items: [item] });
    });

    return (
        <div className="dsaPage">
            <header className="dsaHeader">
                <div className="dsaHeaderTitle">
                    <i className="fa-solid fa-diagram-project"></i>

                    <div>
                        <h2>DSA Hub</h2>
                        <p>Learn, visualize, practice and get quizzed.</p>
                    </div>
                </div>

                <div className="dsaProgress" title={`${doneCount} of ${TOPICS.length} topics completed`}>
                    <div className="dsaProgressText">
                        <span>
                            {doneCount} / {TOPICS.length} topics completed
                        </span>
                        <strong>{percent}%</strong>
                    </div>

                    <div className="dsaProgressBar">
                        <span style={{ width: `${percent}%` }}></span>
                    </div>
                </div>

                <button type="button" className="dsBtn" onClick={() => setView("chat")}>
                    <i className="fa-solid fa-arrow-left"></i> Back to chat
                </button>
            </header>

            <div className="dsaBody">
                <nav className="dsaNav" aria-label="Topics">
                    <input
                        type="text"
                        className="dsInput"
                        value={search}
                        placeholder="Search topics..."
                        aria-label="Search topics"
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <div className="dsaFilters" role="group" aria-label="Level">
                        {["All", ...LEVELS].map((name) => (
                            <button
                                type="button"
                                key={name}
                                className={level === name ? "active" : ""}
                                aria-pressed={level === name}
                                onClick={() => setLevel(name)}
                            >
                                {name}
                            </button>
                        ))}
                    </div>

                    {groups.length === 0 && <p className="dsaNoResult">No topics match your search.</p>}

                    {groups.map((group) => (
                        <div className="dsaGroup" key={group.name}>
                            <h4>{group.name}</h4>

                            {group.items.map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    className={item.id === topic.id ? "dsaItem active" : "dsaItem"}
                                    aria-current={item.id === topic.id ? "true" : undefined}
                                    onClick={() => selectTopic(item.id)}
                                >
                                    <i className={item.icon}></i>

                                    <span className="dsaItemText">
                                        <strong>{item.title}</strong>

                                        <small>
                                            {item.level}
                                            {progress.best[item.id] !== undefined &&
                                                ` · quiz ${progress.best[item.id]}/${item.quiz.length}`}
                                        </small>
                                    </span>

                                    {progress.done[item.id] && (
                                        <i
                                            className="fa-solid fa-circle-check dsaDone"
                                            title="Completed"
                                        ></i>
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                <main className="dsaMain">
                    <div className="dsaTopicHead">
                        <div>
                            <h3>{topic.title}</h3>

                            <p className="dsaMeta">
                                <span className={`dsaLevel ${topic.level.toLowerCase()}`}>{topic.level}</span>
                                <span>About {topic.minutes} minutes</span>
                            </p>
                        </div>

                        <div className="dsaActions">
                            <button
                                type="button"
                                className={progress.done[topic.id] ? "dsBtn done" : "dsBtn"}
                                onClick={() => toggleDone(topic.id)}
                                aria-pressed={Boolean(progress.done[topic.id])}
                            >
                                <i
                                    className={
                                        progress.done[topic.id]
                                            ? "fa-solid fa-circle-check"
                                            : "fa-regular fa-circle"
                                    }
                                ></i>
                                {progress.done[topic.id] ? "Completed" : "Mark as completed"}
                            </button>

                            <button
                                type="button"
                                className="dsBtn"
                                onClick={() =>
                                    ask(
                                        `Explain ${topic.title} to me step by step, starting from the basics. Use simple Java examples.`,
                                        "learn"
                                    )
                                }
                            >
                                <i className="fa-solid fa-comments"></i> Explain with SigmaGPT
                            </button>

                            <button
                                type="button"
                                className="dsBtn"
                                onClick={() =>
                                    ask(
                                        `Start a mock technical interview focused on ${topic.title}.`,
                                        "interview"
                                    )
                                }
                            >
                                <i className="fa-solid fa-microphone-lines"></i> Interview me
                            </button>
                        </div>
                    </div>

                    <div className="dsaTabs" role="tablist" aria-label="Topic sections">
                        {TABS.map((item) => (
                            <button
                                type="button"
                                key={item.key}
                                role="tab"
                                aria-selected={tab === item.key}
                                className={tab === item.key ? "dsaTab active" : "dsaTab"}
                                onClick={() => setTab(item.key)}
                            >
                                <i className={item.icon}></i> {item.label}
                            </button>
                        ))}
                    </div>

                    <div role="tabpanel">
                        {tab === "learn" && <LearnTab topic={topic} />}

                        {tab === "visualize" && (
                            <div className="dsaContent">
                                <VisualizeTab key={topic.id} topic={topic} ask={ask} />
                            </div>
                        )}

                        {tab === "code" && <CodeTab key={topic.id} topic={topic} />}

                        {tab === "practice" && <PracticeTab topic={topic} ask={ask} />}

                        {tab === "quiz" && (
                            <QuizTab
                                key={topic.id}
                                topic={topic}
                                best={progress.best[topic.id]}
                                onFinish={(score) => saveBest(topic.id, score)}
                            />
                        )}
                    </div>

                    {nextTopic && (
                        <button
                            type="button"
                            className="dsaNext"
                            onClick={() => selectTopic(nextTopic.id)}
                        >
                            Next topic: <strong>{nextTopic.title}</strong>
                            <i className="fa-solid fa-arrow-right"></i>
                        </button>
                    )}
                </main>
            </div>
        </div>
    );
}

export default DsaPage;