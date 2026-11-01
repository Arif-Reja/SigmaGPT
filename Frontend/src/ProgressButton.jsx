import "./Scorecard.css";
import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import ScorecardView from "./ScorecardView.jsx";
import {
    deleteScorecard,
    formatDate,
    friendlyError,
    getScorecard,
    gradeFor,
    listScorecards,
    toneFor10
} from "./scorecards.js";

const average = (numbers) =>
    numbers.length
        ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length
        : 0;

// Score over time, drawn as a small line chart
function TrendChart({ items }) {
    const width = 600;
    const height = 190;
    const padLeft = 34;
    const padRight = 16;
    const padTop = 14;
    const padBottom = 28;
    const innerWidth = width - padLeft - padRight;
    const innerHeight = height - padTop - padBottom;

    const yFor = (value) => padTop + innerHeight - (value / 100) * innerHeight;

    const points = items.map((item, index) => ({
        item,
        x:
            padLeft +
            (items.length === 1
                ? innerWidth / 2
                : (index / (items.length - 1)) * innerWidth),
        y: yFor(item.overall)
    }));

    return (
        <svg
            className="trendChart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Overall scores over time. Latest: ${items[items.length - 1].overall} out of 100.`}
        >
            {[0, 50, 100].map((value) => (
                <g key={value}>
                    <line
                        x1={padLeft}
                        x2={width - padRight}
                        y1={yFor(value)}
                        y2={yFor(value)}
                        stroke="#2a2a2a"
                        strokeWidth="1"
                    />
                    <text
                        x={padLeft - 8}
                        y={yFor(value) + 4}
                        textAnchor="end"
                        className="trendLabel"
                    >
                        {value}
                    </text>
                </g>
            ))}

            {points.length > 1 && (
                <polyline
                    points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill="none"
                    stroke="#8b8dff"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            )}

            {points.map((point) => (
                <circle
                    key={point.item.id}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="#8b8dff"
                    stroke="#1b1b1b"
                    strokeWidth="2"
                >
                    <title>
                        {`${formatDate(point.item.date)}: ${point.item.overall}/100 · ${point.item.topic}`}
                    </title>
                </circle>
            ))}

            <text x={padLeft} y={height - 8} className="trendLabel">
                {formatDate(items[0].date)}
            </text>

            {items.length > 1 && (
                <text
                    x={width - padRight}
                    y={height - 8}
                    textAnchor="end"
                    className="trendLabel"
                >
                    {formatDate(items[items.length - 1].date)}
                </text>
            )}
        </svg>
    );
}

function ProgressModal({ onClose }) {
    const [items, setItems] = useState(null); // null while loading
    const [error, setError] = useState("");
    const [selected, setSelected] = useState(null);
    const [opening, setOpening] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const list = await listScorecards();

                if (!cancelled) setItems(list);
            } catch (err) {
                if (!cancelled) {
                    setError(friendlyError(err));
                    setItems([]);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    const openScorecard = async (id) => {
        if (opening) return;

        setOpening(true);
        setError("");

        try {
            setSelected(await getScorecard(id));
        } catch (err) {
            setError(friendlyError(err));
        } finally {
            setOpening(false);
        }
    };

    const removeScorecard = async () => {
        if (
            !selected ||
            !window.confirm("Delete this scorecard? This cannot be undone.")
        ) {
            return;
        }

        try {
            await deleteScorecard(selected.id);

            setItems((prev) => prev.filter((item) => item.id !== selected.id));
            setSelected(null);
        } catch (err) {
            setError(friendlyError(err));
        }
    };

    // ----- One scorecard -----
    if (selected) {
        return (
            <Modal title="Scorecard" onClose={onClose} wide>
                <div className="scTopBar">
                    <button
                        type="button"
                        className="scBack"
                        onClick={() => setSelected(null)}
                    >
                        <i className="fa-solid fa-arrow-left"></i> All interviews
                    </button>

                    <button
                        type="button"
                        className="scDelete"
                        onClick={removeScorecard}
                    >
                        <i className="fa-solid fa-trash"></i> Delete
                    </button>
                </div>

                {error && (
                    <div className="scError" role="alert">
                        {error}
                    </div>
                )}

                <ScorecardView scorecard={selected} onClose={onClose} />
            </Modal>
        );
    }

    // ----- The list -----
    const loading = items === null;
    const hasItems = Boolean(items && items.length);

    let stats = null;

    if (hasItems) {
        const latest = items[0];
        const previous = items[1];
        const recent = items.slice(0, 10);

        stats = {
            count: items.length,
            latest: latest.overall,
            best: Math.max(...items.map((item) => item.overall)),
            recentAverage: Math.round(
                average(items.slice(0, 5).map((item) => item.overall))
            ),
            delta: previous ? latest.overall - previous.overall : null,
            skills: [
                {
                    key: "correctness",
                    label: "Correctness",
                    value: average(recent.map((item) => item.scores.correctness))
                },
                {
                    key: "communication",
                    label: "Communication",
                    value: average(recent.map((item) => item.scores.communication))
                },
                {
                    key: "depth",
                    label: "Depth",
                    value: average(recent.map((item) => item.scores.depth))
                }
            ],
            chronological: [...items].reverse().slice(-20)
        };
    }

    return (
        <Modal title="Interview progress" onClose={onClose} wide>
            {loading && (
                <div className="scLoading">
                    <span className="scSpinner"></span> Loading your progress...
                </div>
            )}

            {error && (
                <div className="scError" role="alert">
                    {error}
                </div>
            )}

            {!loading && !hasItems && !error && (
                <div className="scEmpty">
                    <i className="fa-solid fa-chart-line"></i>
                    <h3>No scorecards yet</h3>
                    <p>
                        Switch to <strong>Interview</strong> mode, answer a few
                        questions, then press <strong>Finish &amp; get scorecard</strong>.
                        Your results will show up here.
                    </p>
                </div>
            )}

            {stats && (
                <>
                    <div className="progressStats">
                        <div className="statBox">
                            <span>Interviews</span>
                            <strong>{stats.count}</strong>
                        </div>

                        <div className="statBox">
                            <span>Latest</span>
                            <strong>
                                {stats.latest}
                                {stats.delta !== null && stats.delta !== 0 && (
                                    <em
                                        className={
                                            stats.delta > 0 ? "delta up" : "delta down"
                                        }
                                    >
                                        {stats.delta > 0 ? "▲" : "▼"}{" "}
                                        {Math.abs(stats.delta)}
                                    </em>
                                )}
                            </strong>
                        </div>

                        <div className="statBox">
                            <span>Best</span>
                            <strong>{stats.best}</strong>
                        </div>

                        <div className="statBox">
                            <span>Recent average</span>
                            <strong>{stats.recentAverage}</strong>
                        </div>
                    </div>

                    <section className="scSection">
                        <h4>Score over time</h4>
                        <TrendChart items={stats.chronological} />
                    </section>

                    <section className="scSection">
                        <h4>Skill averages (last 10 interviews)</h4>

                        {stats.skills.map((skill) => (
                            <div className="scBarRow" key={skill.key}>
                                <div className="scBarLabel">
                                    <span>{skill.label}</span>
                                    <strong>{skill.value.toFixed(1)}/10</strong>
                                </div>

                                <div className="scBar">
                                    <span
                                        className={toneFor10(skill.value)}
                                        style={{ width: `${skill.value * 10}%` }}
                                    ></span>
                                </div>
                            </div>
                        ))}
                    </section>

                    <section className="scSection">
                        <h4>All interviews</h4>

                        <div className="historyList">
                            {items.map((item) => {
                                const grade = gradeFor(item.overall);

                                return (
                                    <button
                                        type="button"
                                        className="historyRow"
                                        key={item.id}
                                        onClick={() => openScorecard(item.id)}
                                        disabled={opening}
                                    >
                                        <span className="historyText">
                                            <strong>{item.topic}</strong>
                                            <small>
                                                {formatDate(item.date)} ·{" "}
                                                {item.answeredCount}{" "}
                                                {item.answeredCount === 1
                                                    ? "answer"
                                                    : "answers"}
                                            </small>
                                        </span>

                                        <span className={`scBadge ${grade.tone}`}>
                                            {item.overall}/100
                                        </span>

                                        <i className="fa-solid fa-chevron-right"></i>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}
        </Modal>
    );
}

// The button in the sidebar
function ProgressButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                className="progressBtn"
                onClick={() => setOpen(true)}
            >
                <i className="fa-solid fa-chart-line"></i> Interview progress
            </button>

            {open && <ProgressModal onClose={() => setOpen(false)} />}
        </>
    );
}

export default ProgressButton;