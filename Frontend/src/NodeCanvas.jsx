import "./Dsa.css";
function NodeCanvas({ nodes, edges, width, height, label }) {
    const byId = new Map(nodes.map((node) => [node.id, node]));

    return (
        <svg
            className="ncCanvas"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={label}
        >
            {edges.map((edge) => {
                const a = byId.get(edge.from);
                const b = byId.get(edge.to);

                if (!a || !b) return null;

                return (
                    <line
                        key={`${edge.from}-${edge.to}`}
                        className={`ncEdge ${edge.state || ""}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                    />
                );
            })}

            {nodes.map((node) => (
                <g
                    key={node.id}
                    className={`ncNode ${node.state || "idle"}`}
                    transform={`translate(${node.x} ${node.y})`}
                >
                    <circle r="18" />

                    <text
                        className="ncLabel"
                        textAnchor="middle"
                        dominantBaseline="central"
                    >
                        {node.label}
                    </text>

                    {node.caption && (
                        <text className="ncCaption" textAnchor="middle" y="34">
                            {node.caption}
                        </text>
                    )}
                </g>
            ))}
        </svg>
    );
}

export default NodeCanvas;