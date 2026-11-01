import "./Scorecard.css";
import { useState } from "react";
import VisualizerModal from "./VisualizerModal.jsx";
function VisualizerButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                className="progressBtn"
                onClick={() => setOpen(true)}
            >
                <i className="fa-solid fa-chart-simple"></i> Algorithm visualizer
            </button>

            {open && (
                <VisualizerModal
                    initialAlgorithm="bubble"
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}

export default VisualizerButton;