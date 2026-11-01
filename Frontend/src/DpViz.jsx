import "./Dsa.css";
import { useMemo, useState } from "react";
import { PlaybackBar, usePlayback } from "./Playback.jsx";

const MAX_LETTERS = 8;

const PRESETS = [
    ["ABCBDAB", "BDCABA"],
    ["AGGTAB", "GXTXAYB"],
    ["ZEBRA", "ZEBU"]
];

const cleanLetters = (text) =>
    text.toUpperCase().replace(/[^A-Z]/g, "").slice(0, MAX_LETTERS);

const same = (cell, i, j) => cell && cell[0] === i && cell[1] === j;
const includesCell = (list, i, j) => list.some((cell) => same(cell, i, j));

const buildLcs = (a, b) => {
    if (!a || !b) {
        return [
            {
                table: [[0]],
                cell: null,
                sources: [],
                path: [],
                result: "",
                message: "Type at least one letter in each box."
            }
        ];
    }

    const m = a.length;
    const n = b.length;
    const table = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : null))
    );
    const steps = [];

    const snap = (message, extra = {}) =>
        steps.push({
            table: table.map((row) => [...row]),
            cell: null,
            sources: [],
            path: [],
            result: "",
            message,
            ...extra
        });

    snap("Row 0 and column 0 are 0: an empty string has nothing in common with any string.");

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                table[i][j] = table[i - 1][j - 1] + 1;

                snap(
                    `${a[i - 1]} = ${b[j - 1]}: the letters match, so take the diagonal value and add 1, which gives ${table[i][j]}.`,
                    { cell: [i, j], sources: [[i - 1, j - 1]] }
                );
            } else {
                const up = table[i - 1][j];
                const left = table[i][j - 1];

                table[i][j] = Math.max(up, left);

                snap(
                    `${a[i - 1]} ≠ ${b[j - 1]}: take the larger of the cell above (${up}) and the cell to the left (${left}), which gives ${table[i][j]}.`,
                    { cell: [i, j], sources: [[i - 1, j], [i, j - 1]] }
                );
            }
        }
    }
    let i = m;
    let j = n;
    let result = "";
    const path = [[i, j]];

    snap(
        `The table is full: the longest common subsequence has length ${table[m][n]}. Now trace back from the bottom-right corner to find the letters.`,
        { cell: [m, n], path: [...path] }
    );

    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            const letter = a[i - 1];

            result = letter + result;
            i--;
            j--;
            path.push([i, j]);

            snap(`The letters match (${letter}): keep it and move diagonally. Result so far: ${result}.`, {
                cell: [i, j],
                path: [...path],
                result
            });
        } else if (table[i - 1][j] >= table[i][j - 1]) {
            i--;
            path.push([i, j]);

            snap("No match: the cell above is at least as big, so move up.", {
                cell: [i, j],
                path: [...path],
                result
            });
        } else {
            j--;
            path.push([i, j]);

            snap("No match: the cell to the left is bigger, so move left.", {
                cell: [i, j],
                path: [...path],
                result
            });
        }
    }

    snap(`Done: the longest common subsequence is "${result}" (length ${result.length}).`, {
        path: [...path],
        result
    });

    return steps;
};

function DpViz() {
    const [first, setFirst] = useState(PRESETS[0][0]);
    const [second, setSecond] = useState(PRESETS[0][1]);

    const steps = useMemo(() => buildLcs(first, second), [first, second]);
    const playback = usePlayback(steps, 2);
    const step = playback.step;
    const rows = step.table.length;
    const cols = step.table[0].length;

    return (
        <div className="dsViz">
            <div className="dsRow">
                <label className="dsField">
                    <span>First string (letters)</span>

                    <input
                        type="text"
                        className="dsInput"
                        value={first}
                        maxLength={MAX_LETTERS}
                        onChange={(e) => setFirst(cleanLetters(e.target.value))}
                    />
                </label>

                <label className="dsField">
                    <span>Second string (letters)</span>

                    <input
                        type="text"
                        className="dsInput"
                        value={second}
                        maxLength={MAX_LETTERS}
                        onChange={(e) => setSecond(cleanLetters(e.target.value))}
                    />
                </label>
            </div>

            <div className="dsRow">
                {PRESETS.map(([a, b]) => (
                    <button
                        type="button"
                        key={`${a}-${b}`}
                        className="dsBtn"
                        onClick={() => {
                            setFirst(a);
                            setSecond(b);
                        }}
                    >
                        {a} / {b}
                    </button>
                ))}
            </div>

            <div className="dsStage">
                <div className="dpWrap">
                    <table className="dpTable" aria-label="Longest common subsequence table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>∅</th>

                                {second.split("").map((letter, index) => (
                                    <th key={index}>{letter}</th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {step.table.map((row, i) => (
                                <tr key={i}>
                                    <th>{i === 0 ? "∅" : first[i - 1]}</th>

                                    {row.map((value, j) => {
                                        let state = value === null ? "empty" : "filled";

                                        if (includesCell(step.path, i, j)) state = "path";
                                        if (includesCell(step.sources, i, j)) state = "source";
                                        if (same(step.cell, i, j)) state = "current";

                                        return (
                                            <td key={j} className={state}>
                                                {value === null ? "" : value}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="vzMessage" aria-live={playback.playing ? "off" : "polite"}>
                    {step.message}
                </p>

                <div className="dsChips">
                    <span className="dsChipsLabel">Common subsequence</span>

                    {step.result ? (
                        step.result.split("").map((letter, index) => (
                            <span key={index} className="dsChip">
                                {letter}
                            </span>
                        ))
                    ) : (
                        <span className="dsChipsEmpty">found while tracing back</span>
                    )}
                </div>

                <p className="dsNote">
                    Table size: {rows} × {cols} = {rows * cols} cells, so the time is O(m × n). Amber is the cell being
                    filled, blue are the cells it reads from, and green is the path traced back.
                </p>
            </div>

            <PlaybackBar playback={playback} />
        </div>
    );
}

export default DpViz;