import { useContext } from "react";
import { MyContext } from "./MyContext.jsx";
import Modal from "./Modal.jsx";
import Visualizer from "./Visualizer.jsx";

function VisualizerModal({ initialAlgorithm, onClose }) {
    const context = useContext(MyContext);
    const setPrompt = context?.setPrompt;

    const handleAsk = setPrompt
        ? (text) => {
              setPrompt(text);
              onClose();
          }
        : undefined;

    return (
        <Modal title="Algorithm visualizer" onClose={onClose} wide>
            <Visualizer initialAlgorithm={initialAlgorithm} onAsk={handleAsk} />
        </Modal>
    );
}

export default VisualizerModal;