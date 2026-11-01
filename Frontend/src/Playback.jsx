import "./Visualizer.css";
import { useEffect, useState } from "react";
import { BASE_DELAY_MS, SPEEDS } from "./algorithms.js";

export const usePlayback = (steps, startSpeed = 1) => {
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speedIndex, setSpeedIndex] = useState(startSpeed);

    const last = steps.length - 1;
    const current = Math.min(index, last);
    useEffect(() => {
        setIndex(0);
        setPlaying(false);
    }, [steps]);

    useEffect(() => {
        if (!playing) return undefined;

        if (current >= last) {
            setPlaying(false);
            return undefined;
        }

        const timer = setTimeout(
            () => setIndex(current + 1),
            BASE_DELAY_MS / SPEEDS[speedIndex]
        );

        return () => clearTimeout(timer);
    }, [playing, current, last, speedIndex]);

    const goTo = (target) => {
        setPlaying(false);
        setIndex(Math.min(Math.max(target, 0), last));
    };

    const toggle = () => {
        if (playing) {
            setPlaying(false);
            return;
        }

        if (current >= last) {
            setIndex(0);
        }

        setPlaying(true);
    };

    return {
        current,
        last,
        total: steps.length,
        step: steps[current],
        playing,
        speedIndex,
        setSpeedIndex,
        goTo,
        toggle
    };
};

export function PlaybackBar({ playback }) {
    const { current, last, total, playing, speedIndex, setSpeedIndex, goTo, toggle } =
        playback;

    return (
        <>
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
                    onClick={toggle}
                    aria-label={playing ? "Pause" : "Play"}
                    title={playing ? "Pause" : "Play"}
                >
                    <i className={playing ? "fa-solid fa-pause" : "fa-solid fa-play"}></i>
                </button>

                <button
                    type="button"
                    className="vzBtn"
                    onClick={() => goTo(current + 1)}
                    disabled={current >= last}
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
                    max={Math.max(last, 1)}
                    value={current}
                    onChange={(e) => goTo(Number(e.target.value))}
                    aria-label="Step"
                />

                <span>
                    Step {current + 1} / {total}
                </span>
            </div>
        </>
    );
}