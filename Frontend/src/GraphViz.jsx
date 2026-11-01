import "./Dsa.css";
import { useMemo, useState } from "react";
import NodeCanvas from "./NodeCanvas.jsx";
import { PlaybackBar, usePlayback } from "./Playback.jsx";

const WIDTH = 600;
const HEIGHT = 300;

const NODES = [
    { id: "A", label: "A", x: 60, y: 150 },
    { id: "B", label: "B", x: 190, y: 70 },
    { id: "C", label: "C", x: 190, y: 230 },
    { id: "D", label: "D", x: 330, y: 40 },
    { id: "E", label: "E", x: 330, y: 150 },
    { id: "F", label: "F", x: 470, y: 90 },
    { id: "G", label: "G", x: 540, y: 200 },
    { id: "H", label: "H", x: 330, y: 260 }
];

const EDGE_PAIRS = [
    ["A", "B"],
    ["A", "C"],
    ["B", "D"],
    ["B", "E"],
    ["C", "E"],
    ["C", "H"],
    ["D", "F"],
    ["E", "F"],
    ["E", "G"],
    ["F", "G"]
];

// Neighbours are always visited in alphabetical order
const ADJACENT = {};

NODES.forEach((node) => {
    ADJACENT[node.id] = [];
});

EDGE_PAIRS.forEach(([a, b]) => {
    ADJACENT[a].push(b);
    ADJACENT[b].push(a);
});

Object.values(ADJACENT).forEach((list) => list.sort());

const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

const runBfs = (start) => {
    const steps = [];
    const order = [];
    const queue = [start];
    const discovered = new Set([start]);
    const dist = { [start]: 0 };
    const used = [];

    const push = (message, current = null, active = null) =>
        steps.push({
            current,
            order: [...order],
            frontier: [...queue],
            dist: { ...dist },
            used: [...used],
            active,
            message
        });

    push(`Start at ${start}: put it in the queue with distance 0.`);

    while (queue.length) {
        const node = queue.shift();

        order.push(node);
        push(`Take ${node} from the front of the queue and visit it.`, node);

        ADJACENT[node].forEach((next) => {
            if (discovered.has(next)) {
                push(`${node} to ${next}: already discovered, skip it.`, node, edgeKey(node, next));
                return;
            }

            discovered.add(next);
            dist[next] = dist[node] + 1;
            queue.push(next);
            used.push(edgeKey(node, next));

            push(
                `${node} to ${next}: new! Add ${next} to the queue (distance ${dist[next]}).`,
                node,
                edgeKey(node, next)
            );
        });
    }

    push(`The queue is empty. Visit order: ${order.join(", ")}.`);

    return steps;
};

const runDfs = (start) => {
    const steps = [];
    const order = [];
    const path = [];
    const visited = new Set();
    const used = [];

    const push = (message, current = null, active = null) =>
        steps.push({
            current,
            order: [...order],
            frontier: [...path],
            dist: {},
            used: [...used],
            active,
            message
        });

    push(`Start the search at ${start}.`);

    const go = (node, from) => {
        visited.add(node);
        order.push(node);
        path.push(node);

        push(
            `Visit ${node}${from ? ` (reached from ${from})` : ""}. Call stack: ${path.join(" → ")}.`,
            node,
            from ? edgeKey(from, node) : null
        );

        ADJACENT[node].forEach((next) => {
            if (visited.has(next)) {
                push(`${node} to ${next}: already visited, skip it.`, node, edgeKey(node, next));
                return;
            }

            used.push(edgeKey(node, next));
            go(next, node);
            push(`Backtrack to ${node}.`, node);
        });

        path.pop();
    };

    go(start, null);

    push(`Done. Visit order: ${order.join(", ")}.`);

    return steps;
};

const stateOf = (step, id, kind) => {
    if (step.current === id) return "current";

    if (kind === "dfs") {
        if (step.frontier.includes(id)) return "queued";
        if (step.order.includes(id)) return "visited";
    } else {
        if (step.order.includes(id)) return "visited";
        if (step.frontier.includes(id)) return "queued";
    }

    return "idle";
};

function GraphViz() {
    const [kind, setKind] = useState("bfs");
    const [start, setStart] = useState("A");

    const steps = useMemo(
        () => (kind === "bfs" ? runBfs(start) : runDfs(start)),
        [kind, start]
    );

    const playback = usePlayback(steps);
    const step = playback.step;

    const nodes = NODES.map((node) => ({
        ...node,
        state: stateOf(step, node.id, kind),
        caption: kind === "bfs" && step.dist[node.id] !== undefined ? `d=${step.dist[node.id]}` : ""
    }));

    const edges = EDGE_PAIRS.map(([from, to]) => {
        const key = edgeKey(from, to);

        return {
            from,
            to,
            state: step.active === key ? "active" : step.used.includes(key) ? "used" : ""
        };
    });

    return (
        <div className="dsViz">
            <div className="dsRow">
                <div className="dsSegment" role="group" aria-label="Algorithm">
                    <button
                        type="button"
                        className={kind === "bfs" ? "active" : ""}
                        aria-pressed={kind === "bfs"}
                        onClick={() => setKind("bfs")}
                    >
                        BFS (queue)
                    </button>

                    <button
                        type="button"
                        className={kind === "dfs" ? "active" : ""}
                        aria-pressed={kind === "dfs"}
                        onClick={() => setKind("dfs")}
                    >
                        DFS (recursion)
                    </button>
                </div>

                <label className="dsField">
                    <span>Start node</span>

                    <select
                        className="dsInput small"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                    >
                        {NODES.map((node) => (
                            <option key={node.id} value={node.id}>
                                {node.id}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="dsStage">
                <NodeCanvas
                    nodes={nodes}
                    edges={edges}
                    width={WIDTH}
                    height={HEIGHT}
                    label={`Graph search: ${step.message}`}
                />

                <p className="vzMessage" aria-live={playback.playing ? "off" : "polite"}>
                    {step.message}
                </p>

                <div className="dsChips">
                    <span className="dsChipsLabel">Visit order</span>

                    {step.order.length === 0 && <span className="dsChipsEmpty">nothing yet</span>}

                    {step.order.map((id) => (
                        <span key={id} className="dsChip">
                            {id}
                        </span>
                    ))}
                </div>

                <div className="dsChips">
                    <span className="dsChipsLabel">{kind === "bfs" ? "Queue" : "Call stack"}</span>

                    {step.frontier.length === 0 && <span className="dsChipsEmpty">empty</span>}

                    {step.frontier.map((id, index) => (
                        <span key={`${index}-${id}`} className="dsChip purple">
                            {id}
                        </span>
                    ))}
                </div>

                <p className="dsNote">
                    {kind === "bfs"
                        ? `d is the distance from ${start}: the fewest edges needed to reach each node. Green lines show how each node was discovered.`
                        : "DFS goes as deep as it can, then backtracks. Green lines show the path it took."}
                </p>
            </div>

            <PlaybackBar playback={playback} />
        </div>
    );
}

export default GraphViz;