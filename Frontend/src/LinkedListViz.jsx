import "./Dsa.css";
import { useState } from "react";

const MAX_NODES = 8;
const START = [10, 20, 30];

const randomValue = () => Math.floor(Math.random() * 99) + 1;

function LinkedListViz() {
    const [items, setItems] = useState(START);
    const [input, setInput] = useState("");
    const [log, setLog] = useState(["Try inserting, deleting, searching and reversing."]);
    const [highlight, setHighlight] = useState(null);

    const say = (message) => setLog((prev) => [message, ...prev].slice(0, 6));

    // Reads the number box. When "required" is false, empty means a random number.
    const readValue = (required) => {
        const text = input.trim();

        if (!text) {
            if (required) {
                say("Type the number to look for first.");
                return null;
            }

            return randomValue();
        }

        if (!/^\d{1,3}$/.test(text)) {
            say("Enter a whole number up to 999.");
            return null;
        }

        return Number(text);
    };

    const insertHead = () => {
        const value = readValue(false);

        if (value === null) return;

        if (items.length >= MAX_NODES) {
            say(`This demo holds ${MAX_NODES} nodes at most.`);
            return;
        }

        setItems([value, ...items]);
        setHighlight(0);
        setInput("");
        say(`Insert ${value} at the head: the new node points to the old head, and head moves to it. O(1).`);
    };

    const insertTail = () => {
        const value = readValue(false);

        if (value === null) return;

        if (items.length >= MAX_NODES) {
            say(`This demo holds ${MAX_NODES} nodes at most.`);
            return;
        }

        setItems([...items, value]);
        setHighlight(items.length);
        setInput("");
        say(
            `Insert ${value} at the tail: walk ${items.length} node${items.length === 1 ? "" : "s"} to reach the end. O(n), or O(1) if you keep a tail pointer.`
        );
    };

    const remove = () => {
        const value = readValue(true);

        if (value === null) return;

        const index = items.indexOf(value);

        if (index === -1) {
            say(`${value} is not in the list. Checked all ${items.length} nodes. O(n).`);
            setHighlight(null);
            return;
        }

        setItems(items.filter((_, position) => position !== index));
        setHighlight(null);
        setInput("");
        say(
            `Delete ${value}: found after ${index + 1} step${index === 0 ? "" : "s"}. The node before it now points to the node after it.`
        );
    };

    const search = () => {
        const value = readValue(true);

        if (value === null) return;

        const index = items.indexOf(value);

        if (index === -1) {
            say(`Search ${value}: checked all ${items.length} nodes and it is not there. O(n).`);
            setHighlight(null);
            return;
        }

        setHighlight(index);
        say(`Search ${value}: found at position ${index} after ${index + 1} step${index === 0 ? "" : "s"}. O(n).`);
    };

    const reverse = () => {
        if (items.length < 2) {
            say("A list with fewer than two nodes is already reversed.");
            return;
        }

        setItems([...items].reverse());
        setHighlight(null);
        say("Reversed: every next pointer now points the other way. O(n) time and O(1) space with three pointers (prev, curr, next).");
    };

    const reset = () => {
        setItems(START);
        setHighlight(null);
        setInput("");
        setLog(["List reset."]);
    };

    return (
        <div className="dsViz">
            <div className="dsStage">
                <div className="llRow" aria-label="Linked list">
                    <span className="llHead">head</span>

                    {items.length === 0 && <span className="llNull">empty: head points to null</span>}

                    {items.map((value, index) => (
                        <div className="llItem" key={`${index}-${value}`}>
                            <span className="llArrow" aria-hidden="true">
                                →
                            </span>

                            <div className={`llNode${highlight === index ? " hl" : ""}`}>
                                <span className="llValue">{value}</span>
                                <span className="llNext" title="next pointer"></span>
                            </div>
                        </div>
                    ))}

                    {items.length > 0 && (
                        <>
                            <span className="llArrow" aria-hidden="true">
                                →
                            </span>

                            <span className="llNull">null</span>
                        </>
                    )}
                </div>

                <p className="dsCount">
                    {items.length} / {MAX_NODES} nodes
                </p>
            </div>

            <div className="dsRow">
                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    className="dsInput"
                    value={input}
                    placeholder="Number"
                    aria-label="Value"
                    onChange={(e) => setInput(e.target.value)}
                />

                <button type="button" className="dsBtn primary" onClick={insertHead}>
                    Insert at head
                </button>

                <button type="button" className="dsBtn" onClick={insertTail}>
                    Insert at tail
                </button>

                <button type="button" className="dsBtn" onClick={remove}>
                    Delete
                </button>

                <button type="button" className="dsBtn" onClick={search}>
                    Search
                </button>

                <button type="button" className="dsBtn" onClick={reverse}>
                    Reverse
                </button>

                <button type="button" className="dsBtn" onClick={reset}>
                    Reset
                </button>
            </div>

            <ul className="dsLog" aria-live="polite">
                {log.map((message, index) => (
                    <li key={`${index}-${message}`}>{message}</li>
                ))}
            </ul>
        </div>
    );
}

export default LinkedListViz;