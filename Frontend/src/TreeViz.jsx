import "./Dsa.css";
import { useMemo, useState } from "react";
import NodeCanvas from "./NodeCanvas.jsx";
import { PlaybackBar, usePlayback } from "./Playback.jsx";
import { parseNumberList, parseTarget } from "./algorithms.js";

const MAX_NODES = 15;
const WIDTH = 600;

const MODES = [
    { key: "inorder", label: "Inorder" },
    { key: "preorder", label: "Preorder" },
    { key: "postorder", label: "Postorder" },
    { key: "level", label: "Level order" },
    { key: "search", label: "Search" }
];

const BALANCED = [50, 30, 70, 20, 40, 60, 80];
const CHAIN = [10, 20, 30, 40, 50, 60];

const randomValues = () => {
    const pool = Array.from({ length: 95 }, (_, index) => index + 5);

    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, 8);
};

// ===== The tree =====

const buildTree = (values) => {
    const insert = (node, v) => {
        if (!node) return { v, left: null, right: null };

        if (v < node.v) node.left = insert(node.left, v);
        else if (v > node.v) node.right = insert(node.right, v);

        return node;
    };

    let root = null;

    values.forEach((v) => {
        root = insert(root, v);
    });

    return root;
};

// Left to right = inorder position, top to bottom = depth
const layoutTree = (root) => {
    const list = [];
    let rank = 0;

    const walk = (node, depth) => {
        if (!node) return;

        walk(node.left, depth + 1);
        list.push({ node, depth, rank: rank++ });
        walk(node.right, depth + 1);
    };

    walk(root, 0);

    const count = list.length;
    const maxDepth = Math.max(0, ...list.map((item) => item.depth));
    const pad = 30;
    const spacing = count > 1 ? (WIDTH - pad * 2) / (count - 1) : 0;

    const nodes = list.map(({ node, depth, rank: position }) => ({
        id: node.v,
        label: String(node.v),
        x: count > 1 ? pad + position * spacing : WIDTH / 2,
        y: 30 + depth * 62
    }));

    const edges = [];

    list.forEach(({ node }) => {
        if (node.left) edges.push({ from: node.v, to: node.left.v });
        if (node.right) edges.push({ from: node.v, to: node.right.v });
    });

    return { nodes, edges, count, height: maxDepth + 1, canvasHeight: 30 + maxDepth * 62 + 40 };
};

// ===== The steps =====

const makeSteps = (root, mode, target) => {
    const steps = [];
    const visited = [];
    const out = [];
    const path = [];

    const push = (message, current = null, extra = {}) =>
        steps.push({
            current,
            found: null,
            visited: [...visited],
            out: [...out],
            path: [...path],
            queue: null,
            message,
            ...extra
        });

    if (!root) {
        push("Add some numbers to build a tree.");
        return steps;
    }

    if (mode === "search") {
        push(`Search for ${target}. Start at the root.`);

        let node = root;

        while (node) {
            path.push(node.v);

            if (target === node.v) {
                push(`${node.v} equals ${target}: found it!`, node.v, { found: node.v });
                return steps;
            }

            const goLeft = target < node.v;

            push(
                `${target} is ${goLeft ? "smaller" : "bigger"} than ${node.v}, so go ${goLeft ? "left" : "right"}.`,
                node.v
            );

            node = goLeft ? node.left : node.right;
        }

        push(`Reached an empty spot: ${target} is not in the tree.`);

        return steps;
    }

    if (mode === "level") {
        const queue = [root];
        const snapshot = () => queue.map((item) => item.v);

        push(`Put the root, ${root.v}, in the queue.`, null, { queue: snapshot() });

        while (queue.length) {
            const node = queue.shift();

            push(`Take ${node.v} from the front of the queue.`, node.v, { queue: snapshot() });

            visited.push(node.v);
            out.push(node.v);

            push(`Visit ${node.v}: add it to the output.`, node.v, { queue: snapshot() });

            [node.left, node.right].forEach((child) => {
                if (!child) return;

                queue.push(child);

                push(`Add ${child.v}, a child of ${node.v}, to the back of the queue.`, node.v, {
                    queue: snapshot()
                });
            });
        }

        push(`Done. The queue is empty. Output: ${out.join(", ")}.`, null, { queue: [] });

        return steps;
    }

    // Inorder, preorder and postorder use recursion
    push("Start at the root. The call stack is empty.");

    const go = (node) => {
        path.push(node.v);
        push(`Call ${mode}(${node.v}).`, node.v);

        const visit = () => {
            visited.push(node.v);
            out.push(node.v);
            push(`Visit ${node.v}: add it to the output.`, node.v);
        };

        if (mode === "preorder") visit();

        if (node.left) {
            push(`Go to the left child of ${node.v}.`, node.v);
            go(node.left);
            push(`Back at ${node.v}.`, node.v);
        }

        if (mode === "inorder") visit();

        if (node.right) {
            push(`Go to the right child of ${node.v}.`, node.v);
            go(node.right);
            push(`Back at ${node.v}.`, node.v);
        }

        if (mode === "postorder") visit();

        path.pop();
    };

    go(root);

    push(`Done. Output: ${out.join(", ")}.`);

    return steps;
};

const stateOf = (step, id) => {
    if (step.found === id) return "found";
    if (step.current === id) return "current";
    if (step.visited.includes(id)) return "visited";
    if (step.queue && step.queue.includes(id)) return "queued";
    if (step.path.includes(id)) return "path";

    return "idle";
};

function TreeViz() {
    const [values, setValues] = useState(BALANCED);
    const [valuesText, setValuesText] = useState(BALANCED.join(", "));
    const [mode, setMode] = useState("inorder");
    const [targetText, setTargetText] = useState("60");
    const [error, setError] = useState("");

    const root = useMemo(() => buildTree(values), [values]);
    const layout = useMemo(() => layoutTree(root), [root]);
    const target = parseTarget(targetText);

    const steps = useMemo(
        () => makeSteps(root, mode, mode === "search" ? target : 0),
        [root, mode, target]
    );

    const playback = usePlayback(steps);
    const step = playback.step;

    const apply = (list) => {
        const unique = [...new Set(list)];

        setValues(unique);
        setValuesText(unique.join(", "));
        setError("");
    };

    const handleBuild = (event) => {
        event.preventDefault();

        const result = parseNumberList(valuesText, MAX_NODES);

        if (result.error) {
            setError(result.error);
            return;
        }

        apply(result.values);
    };

    const nodes = layout.nodes.map((node) => ({ ...node, state: stateOf(step, node.id) }));

    const edges = layout.edges.map((edge) => ({
        ...edge,
        state: step.path.includes(edge.from) && step.path.includes(edge.to) ? "path" : ""
    }));

    const isChain = layout.count >= 4 && layout.height === layout.count;

    const listLabel =
        mode === "level" ? "Queue" : mode === "search" ? "Path" : "Call stack";
    const listItems = mode === "level" ? step.queue || [] : step.path;

    return (
        <div className="dsViz">
            <form className="dsRow" onSubmit={handleBuild}>
                <label className="dsField grow">
                    <span>Values inserted into the tree, in order (1 to 99)</span>

                    <input
                        type="text"
                        className="dsInput"
                        value={valuesText}
                        onChange={(e) => setValuesText(e.target.value)}
                    />
                </label>

                <button type="submit" className="dsBtn primary">
                    Build tree
                </button>
            </form>

            <div className="dsRow">
                <button type="button" className="dsBtn" onClick={() => apply(BALANCED)}>
                    Balanced example
                </button>

                <button type="button" className="dsBtn" onClick={() => apply(CHAIN)}>
                    Chain (sorted input)
                </button>

                <button type="button" className="dsBtn" onClick={() => apply(randomValues())}>
                    Random
                </button>
            </div>

            {error && (
                <p className="vzError" role="alert">
                    {error}
                </p>
            )}

            <div className="dsSegment" role="group" aria-label="What to run">
                {MODES.map((item) => (
                    <button
                        type="button"
                        key={item.key}
                        className={mode === item.key ? "active" : ""}
                        aria-pressed={mode === item.key}
                        onClick={() => setMode(item.key)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {mode === "search" && (
                <div className="dsRow">
                    <label className="dsField">
                        <span>Value to find</span>

                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={2}
                            className="dsInput small"
                            value={targetText}
                            onChange={(e) => setTargetText(e.target.value)}
                        />
                    </label>

                    <button
                        type="button"
                        className="dsBtn"
                        onClick={() =>
                            setTargetText(String(values[Math.floor(Math.random() * values.length)]))
                        }
                    >
                        Pick from the tree
                    </button>
                </div>
            )}

            <div className="dsStage">
                <NodeCanvas
                    nodes={nodes}
                    edges={edges}
                    width={WIDTH}
                    height={layout.canvasHeight}
                    label={`Binary search tree: ${step.message}`}
                />

                <p className="dsInfo">
                    Nodes: {layout.count} · Height: {layout.height}
                    {isChain && " · This tree is a chain, so searching it is O(n), not O(log n)."}
                </p>

                <p className="vzMessage" aria-live={playback.playing ? "off" : "polite"}>
                    {step.message}
                </p>

                {mode !== "search" && (
                    <div className="dsChips">
                        <span className="dsChipsLabel">Output</span>

                        {step.out.length === 0 && <span className="dsChipsEmpty">nothing yet</span>}

                        {step.out.map((value, index) => (
                            <span key={`${index}-${value}`} className="dsChip">
                                {value}
                            </span>
                        ))}
                    </div>
                )}

                <div className="dsChips">
                    <span className="dsChipsLabel">{listLabel}</span>

                    {listItems.length === 0 && <span className="dsChipsEmpty">empty</span>}

                    {listItems.map((value, index) => (
                        <span key={`${index}-${value}`} className="dsChip purple">
                            {value}
                        </span>
                    ))}
                </div>
            </div>

            <PlaybackBar playback={playback} />
        </div>
    );
}

export default TreeViz;