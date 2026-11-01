import "./Scorecard.css";
import { useContext } from "react";
import { MyContext } from "./MyContext.jsx";
function DsaButton({ onNavigate }) {
    const { view, setView } = useContext(MyContext);

    return (
        <button
            type="button"
            className={view === "dsa" ? "progressBtn current" : "progressBtn"}
            onClick={() => {
                setView("dsa");
                onNavigate?.();
            }}
        >
            <i className="fa-solid fa-diagram-project"></i> DSA Hub
        </button>
    );
}

export default DsaButton;