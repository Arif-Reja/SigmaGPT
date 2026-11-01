import "./Visualizer.css";
import { useEffect, useMemo, useState } from "react";
import {
    ALGORITHMS,
    ALGORITHM_GROUPS,
    ARRAY_KINDS,
    BASE_DELAY_MS,
    DEFAULT_SPEED_INDEX,
    MIN_SIZE,
    SPEEDS,
    generateSteps,
    makeArray,
    maxSizeFor,
    missingTarget,
    parseNumberList,
    parseTarget,
    pickTarget
} from "./algorithms.js";

const LEGEND = {
    sort: [
        ["compare", "Comparing"],
        ["swap", "Swapping or writing"],
        ["pivot", "Pivot or smallest"],
        ["sorted", "In place"],
        ["dim", "Not in focus"]
    ],
    search: [
        ["compare", "Checking"],
        ["found", "Found"],
        ["dim", "Ruled out"]
    ]
};

// Which colour a value gets in this step
const stateFor = (step, index) => {
    if (step.found === index) return "found";
    if (step.swap.includes(index)) return "swap";
    if (step.compare.includes(index)) return "compare";
    if (step.pivot === index) return "pivot";
    if (step.sorted.includes(index)) return "sorted";

    return "idle";
};

// Values outside the part being worked on are faded
const isDimmed = (step, index, state) =>
    state === "idle" &&
    step.range !== null &&
    (index < step.range[0] || index > step.range[1]);

const pointerText = (step, index) =>
    step.pointers
        .filter((pointer) => pointer.index === index)
        .map((pointer) => pointer.label)
        .join(" · ");


function Visualizer({ initialAlgorithm = "bubble", onAsk }) {
    const startKey = ALGORITHMS[initialAlgorithm] ? initialAlgorithm : "bubble";

    // Starting data (made once)
    const [initial] = useState(() => {
        const array = makeArray(
            "random",
            ALGORITHMS[startKey].type === "search" ? 10 : 14
        );

        return { array, target: String(pickTarget(array)) };
    });

    const [algoKey, setAlgoKey] = useState(startKey);
    const [base, setBase] = useState(initial.array);
    const [targetText, setTargetText] = useState(initial.target);
    const [customText, setCustomText] = useState("");
    const [inputError, setInputError] = useState("");
    const [stepIndex, setStepIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX);

    const algorithm = ALGORITHMS[algoKey];
    const isSearch = algorithm.type === "search";
    const maxSize = maxSizeFor(algorithm);
    const targetNumber = parseTarget(targetText);

    const steps = useMemo(
        () => generateSteps(algoKey, base, targetNumber),
        [algoKey, base, targetNumber]
    );

    const lastIndex = steps.length - 1;
    const current = Math.min(stepIndex, lastIndex);
    const step = steps[current];

    const maxValue = Math.max(...step.array, 1);
    const dense = step.array.length > 16;

    // New data: start again from the first step
    useEffect(() => {
        setStepIndex(0);
        setPlaying(false);
    }, [steps]);

    // Autoplay: show the next step after a short pause
    useEffect(() => {
        if (!playing) return undefined;

        if (current >= lastIndex) {
            setPlaying(false);
            return undefined;
        }

        const timer = setTimeout(
            () => setStepIndex(current + 1),
            BASE_DELAY_MS / SPEEDS[speedIndex]
        );

        return () => clearTimeout(timer);
    }, [playing, current, lastIndex, speedIndex]);


    // ===== Changing the data =====

    const applyArray = (array) => {
        setBase(array);
        setInputError("");

        if (isSearch) {
            setTargetText(String(pickTarget(array)));
        }
    };

    const selectAlgorithm = (key) => {
        const next = ALGORITHMS[key];
        const limit = maxSizeFor(next);
        const array = base.length > limit ? base.slice(0, limit) : base;

        setAlgoKey(key);
        setInputError("");

        if (array !== base) {
            setBase(array);
        }

        if (next.type === "search" && (!isSearch || array !== base)) {
            setTargetText(String(pickTarget(array)));
        }
    };

    const handleSize = (value) => {
        applyArray(makeArray("random", Number(value)));
    };

    const handleCustom = (event) => {
        event.preventDefault();

        const result = parseNumberList(customText, maxSize);

        if (result.error) {
            setInputError(result.error);
            return;
        }

        applyArray(result.values);
    };


    // ===== Playback =====

    const goTo = (index) => {
        setPlaying(false);
        setStepIndex(Math.min(Math.max(index, 0), lastIndex));
    };

    const togglePlay = () => {
        if (playing) {
            setPlaying(false);
            return;
        }

        if (current >= lastIndex) {
            setStepIndex(0);
        }

        setPlaying(true);
    };

    const handleAsk = () => {
        onAsk?.(
            `Explain this step of ${algorithm.name} to me. Array: [${step.array.join(", ")}]. Step ${current + 1}: ${step.message}`
        );
    };

    const kinds = ARRAY_KINDS.filter((kind) => !isSearch || kind.key === "random");
    const sizeValue = Math.min(Math.max(base.length, MIN_SIZE), maxSize);

    return (
        <div className="visualizer">
            {/* ===== Settings ===== */}
            <div className="vzControls">
                <label className="vzField">
                    <span>Algorithm</span>

                    <select
                        value={algoKey}
                        onChange={(e) => selectAlgorithm(e.target.value)}
                    >
                        {ALGORITHM_GROUPS.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                                {group.keys.map((key) => (
                                    <option key={key} value={key}>
                                        {ALGORITHMS[key].name}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </label>

                <label className="vzField">
                    <span>Size: {base.length}</span>

                    <input
                        type="range"
                        min={MIN_SIZE}
                        max={maxSize}
                        value={sizeValue}
                        onChange={(e) => handleSize(e.target.value)}
                    />
                </label>

                <div className="vzField">
                    <span>Data</span>

                    <div className="vzChips">
                        {kinds.map((kind) => (
                            <button
                                type="button"
                                key={kind.key}
                                className="vzChip"
                                onClick={() =>
                                    applyArray(makeArray(kind.key, base.length))
                                }
                            >
                                {isSearch ? "New random array" : kind.label}
                            </button>
                        ))}
                    </div>
                </div>

                {isSearch && (
                    <div className="vzField">
                        <span>Target</span>

                        <div className="vzChips">
                            <input
                                type="text"
                                inputMode="numeric"
                                className="vzTarget"
                                value={targetText}
                                maxLength={2}
                                aria-label="Target value"
                                onChange={(e) => setTargetText(e.target.value)}
                            />

                            <button
                                type="button"
                                className="vzChip"
                                onClick={() => setTargetText(String(pickTarget(base)))}
                            >
                                From the array
                            </button>

                            <button
                                type="button"
                                className="vzChip"
                                onClick={() =>
                                    setTargetText(String(missingTarget(base)))
                                }
                            >
                                Not in the array
                            </button>
                        </div>
                    </div>
                )}

                <form className="vzCustom" onSubmit={handleCustom}>
                    <label className="vzField grow">
                        <span>Or type your own numbers (1 to 99)</span>

                        <input
                            type="text"
                            value={customText}
                            placeholder="For example: 42, 7, 19, 3, 88"
                            onChange={(e) => setCustomText(e.target.value)}
                        />
                    </label>

                    <button type="submit" className="vzChip">
                        Use these
                    </button>
                </form>
            </div>

            {inputError && (
                <p className="vzError" role="alert">
                    {inputError}
                </p>
            )}

            {algorithm.requiresSorted && (
                <p className="vzNote">
                    Binary search needs sorted data, so your values are sorted
                    before the search starts.
                </p>
            )}

            <div className="vzLayout">
                {/* ===== Animation ===== */}
                <div className="vzMain">
                    <div className="vzStage">
                        <div className="vzStageHead">
                            <strong>{algorithm.name}</strong>

                            <div className="vzStats">
                                <span>
                                    Comparisons <b>{step.comparisons}</b>
                                </span>

                                {!isSearch && (
                                    <span>
                                        {algorithm.moveLabel} <b>{step.moves}</b>
                                    </span>
                                )}
                            </div>
                        </div>

                        {isSearch ? (
                            <div
                                className="vzCells"
                                role="img"
                                aria-label={`${algorithm.name}: ${step.message}`}
                            >
                                {step.array.map((value, index) => {
                                    const state = stateFor(step, index);
                                    const dim = isDimmed(step, index, state);

                                    return (
                                        <div className="vzCellWrap" key={index}>
                                            <div
                                                className={`vzCell ${state}${dim ? " dim" : ""}`}
                                            >
                                                {value}
                                            </div>

                                            <span className="vzIndex">{index}</span>

                                            <span className="vzPointer">
                                                {pointerText(step, index)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div
                                className={dense ? "vzBars dense" : "vzBars"}
                                role="img"
                                aria-label={`${algorithm.name}: ${step.message}`}
                            >
                                {step.array.map((value, index) => {
                                    const state = stateFor(step, index);
                                    const dim = isDimmed(step, index, state);

                                    return (
                                        <div
                                            key={index}
                                            className={`vzBar ${state}${dim ? " dim" : ""}`}
                                            style={{
                                                height: `${Math.max((value / maxValue) * 100, 6)}%`
                                            }}
                                        >
                                            <span className="vzBarValue">{value}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <p
                            className="vzMessage"
                            aria-live={playing ? "off" : "polite"}
                        >
                            {step.message}
                        </p>

                        <div className="vzLegend">
                            {LEGEND[algorithm.type].map(([name, label]) => (
                                <span key={name}>
                                    <i className={`vzSwatch ${name}`}></i>
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="vzPlayback">
                        <button
                            type="button"
                            className="vzBtn"
                            onClick={() => goTo(0)}
                            aria-label="Restart"
                            title="Restart"
                        >
                            <i className="fa-solid fa-rotate-left"></i>
                        </button>

                        <button
                            type="button"
                            className="vzBtn"
                            onClick={() => goTo(current - 1)}
                            disabled={current === 0}
                            aria-label="Previous step"
                            title="Previous step"
                        >
                            <i className="fa-solid fa-backward-step"></i>
                        </button>

                        <button
                            type="button"
                            className="vzBtn play"
                            onClick={togglePlay}
                            aria-label={playing ? "Pause" : "Play"}
                            title={playing ? "Pause" : "Play"}
                        >
                            <i
                                className={
                                    playing ? "fa-solid fa-pause" : "fa-solid fa-play"
                                }
                            ></i>
                        </button>

                        <button
                            type="button"
                            className="vzBtn"
                            onClick={() => goTo(current + 1)}
                            disabled={current >= lastIndex}
                            aria-label="Next step"
                            title="Next step"
                        >
                            <i className="fa-solid fa-forward-step"></i>
                        </button>

                        <div className="vzSpeed" role="group" aria-label="Speed">
                            {SPEEDS.map((speed, index) => (
                                <button
                                    type="button"
                                    key={speed}
                                    className={index === speedIndex ? "active" : ""}
                                    aria-pressed={index === speedIndex}
                                    onClick={() => setSpeedIndex(index)}
                                >
                                    {speed}×
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="vzScrub">
                        <input
                            type="range"
                            min={0}
                            max={Math.max(lastIndex, 1)}
                            value={current}
                            onChange={(e) => goTo(Number(e.target.value))}
                            aria-label="Step"
                        />

                        <span>
                            Step {current + 1} / {steps.length}
                        </span>
                    </div>
                </div>

                {/* ===== Code and facts ===== */}
                <div className="vzSide">
                    <section className="vzPanel">
                        <h4>Java code</h4>

                        <ol className="vzCode">
                            {algorithm.code.map((line, index) => (
                                <li
                                    key={index}
                                    className={index === step.line ? "active" : ""}
                                >
                                    <code>{line}</code>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section className="vzPanel">
                        <h4>About</h4>

                        <p className="vzAbout">{algorithm.description}</p>

                        <dl className="vzComplexity">
                            <div>
                                <dt>Best</dt>
                                <dd>{algorithm.complexity.best}</dd>
                            </div>

                            <div>
                                <dt>Average</dt>
                                <dd>{algorithm.complexity.average}</dd>
                            </div>

                            <div>
                                <dt>Worst</dt>
                                <dd>{algorithm.complexity.worst}</dd>
                            </div>

                            <div>
                                <dt>Space</dt>
                                <dd>{algorithm.complexity.space}</dd>
                            </div>
                        </dl>

                        {!isSearch && (
                            <p className="vzTag">
                                {algorithm.stable ? "Stable sort" : "Not a stable sort"}
                            </p>
                        )}
                    </section>

                    {onAsk && (
                        <button type="button" className="vzAsk" onClick={handleAsk}>
                            <i className="fa-solid fa-comments"></i> Ask SigmaGPT about
                            this step
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Visualizer;