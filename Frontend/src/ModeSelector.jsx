import "./ModeSelector.css";
import { useContext, useEffect } from "react";
import { MyContext } from "./MyContext";

const MODE_STORAGE_KEY = "sigmaGPT_mode";
const SOCRATIC_STORAGE_KEY = "sigmaGPT_socraticMode";

const modes = [
    {
        id: "learn",
        icon: "🧠",
        name: "Learn",
        description: "Understand concepts"
    },
    {
        id: "practice",
        icon: "🧪",
        name: "Practice",
        description: "Solve problems"
    },
    {
        id: "interview",
        icon: "🎤",
        name: "Interview",
        description: "Mock interview"
    },
    {
        id: "developer",
        icon: "💻",
        name: "Developer",
        description: "Build & debug"
    }
];

function ModeSelector() {
    const { mode, setMode, socraticMode, setSocraticMode } =
        useContext(MyContext);
    useEffect(() => {
        try {
            const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
            const savedSocratic = localStorage.getItem(SOCRATIC_STORAGE_KEY);

            if (modes.some((item) => item.id === savedMode)) {
                setMode(savedMode);
            }

            if (savedSocratic === "true") {
                setSocraticMode(true);
            }
        } catch (err) {
            console.warn("Could not restore saved mode:", err);
        }
    }, []);

    const selectMode = (id) => {
        setMode(id);

        try {
            localStorage.setItem(MODE_STORAGE_KEY, id);
        } catch (err) {
            console.warn("Could not save mode:", err);
        }
    };

    const toggleSocratic = (checked) => {
        setSocraticMode(checked);

        try {
            localStorage.setItem(SOCRATIC_STORAGE_KEY, String(checked));
        } catch (err) {
            console.warn("Could not save Socratic mode:", err);
        }
    };

    return (
        <div className="modeSelector">
            <div className="modeTitle">
                <span>Choose your mode</span>
            </div>

            <div className="modeContainer" role="group" aria-label="Mode">
                {modes.map((item) => (
                    <button
                        type="button"
                        key={item.id}
                        className={
                            mode === item.id
                                ? "modeCard active"
                                : "modeCard"
                        }
                        aria-pressed={mode === item.id}
                        onClick={() => selectMode(item.id)}
                    >
                        <span className="modeIcon">
                            {item.icon}
                        </span>

                        <span className="modeInfo">
                            <span className="modeName">
                                {item.name}
                            </span>

                            <span className="modeDescription">
                                {item.description}
                            </span>
                        </span>
                    </button>
                ))}
            </div>

            <label className="socraticToggle">
                <input
                    type="checkbox"
                    checked={socraticMode}
                    onChange={(e) => toggleSocratic(e.target.checked)}
                />
                <span>Socratic mode (guide me with questions)</span>
            </label>
        </div>
    );
}

export default ModeSelector;