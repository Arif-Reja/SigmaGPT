import "./SigmaMark.css";
function SigmaMark({ size = 40, className = "" }) {
    return (
        <span
            className={`sigmaMark ${className}`.trim()}
            style={{
                width: size,
                height: size,
                fontSize: Math.round(size * 0.56)
            }}
            aria-hidden="true"
        >
            Σ
        </span>
    );
}

export default SigmaMark;