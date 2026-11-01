import "./Dsa.css";
import { useState } from "react";

const CAPACITY = 8;

const randomValue = () => Math.floor(Math.random() * 99) + 1;

function StackQueueViz() {
    const [kind, setKind] = useState("stack");
    const [stack, setStack] = useState([42, 17]);
    const [queue, setQueue] = useState([42, 17]);
    const [input, setInput] = useState("");
    const [log, setLog] = useState(["Try push, pop and peek."]);
    const [highlight, setHighlight] = useState(null);

    const isStack = kind === "stack";
    const items = isStack ? stack : queue;
    const setItems = isStack ? setStack : setQueue;

    const say = (message) => setLog((prev) => [message, ...prev].slice(0, 6));

    const switchKind = (next) => {
        setKind(next);
        setHighlight(null);
        setLog([next === "stack" ? "Stack: last in, first out." : "Queue: first in, first out."]);
    };

    // Reads the number box (empty means a random number)
    const readValue = () => {
        const text = input.trim();

        if (!text) return randomValue();

        if (!/^\d{1,3}$/.test(text)) {
            say("Enter a whole number up to 999, or leave the box empty for a random one.");
            return null;
        }

        return Number(text);
    };

    const add = () => {
        const value = readValue();

        if (value === null) return;

        if (items.length >= CAPACITY) {
            say(
                isStack
                    ? `Stack overflow: the stack is full (${CAPACITY} items).`
                    : `Queue overflow: the queue is full (${CAPACITY} items).`
            );
            return;
        }

        setItems([...items, value]);
        setHighlight(items.length);
        setInput("");
        say(
            isStack
                ? `Push ${value}: it goes on top. O(1).`
                : `Enqueue ${value}: it joins the back of the line. O(1).`
        );
    };

    const remove = () => {
        if (!items.length) {
            say(
                isStack
                    ? "Stack underflow: there is nothing to pop."
                    : "Queue underflow: there is nothing to dequeue."
            );
            return;
        }

        const value = isStack ? items[items.length - 1] : items[0];

        setItems(isStack ? items.slice(0, -1) : items.slice(1));
        setHighlight(null);
        say(
            isStack
                ? `Pop: ${value} was added last, so it leaves first (LIFO). O(1).`
                : `Dequeue: ${value} has waited longest, so it leaves first (FIFO). O(1).`
        );
    };

    const peek = () => {
        if (!items.length) {
            say(isStack ? "The stack is empty: nothing to peek at." : "The queue is empty: nothing to peek at.");
            return;
        }

        const index = isStack ? items.length - 1 : 0;

        setHighlight(index);
        say(
            `Peek: the ${isStack ? "top" : "front"} item is ${items[index]}. Nothing is removed. O(1).`
        );
    };

    const clear = () => {
        setItems([]);
        setHighlight(null);
        say("Cleared.");
    };

    const submit = (event) => {
        event.preventDefault();
        add();
    };

    return (
        <div className="dsViz">
            <div className="dsSegment" role="group" aria-label="Structure">
                <button
                    type="button"
                    className={isStack ? "active" : ""}
                    aria-pressed={isStack}
                    onClick={() => switchKind("stack")}
                >
                    Stack (LIFO)
                </button>

                <button
                    type="button"
                    className={!isStack ? "active" : ""}
                    aria-pressed={!isStack}
                    onClick={() => switchKind("queue")}
                >
                    Queue (FIFO)
                </button>
            </div>

            <div className="dsStage">
                {isStack ? (
                    <div className="sqStack" aria-label="Stack, top item first">
                        {items.length === 0 && <div className="sqEmpty">empty stack</div>}

                        {[...items].reverse().map((value, position) => {
                            const index = items.length - 1 - position;

                            return (
                                <div
                                    key={`${index}-${value}`}
                                    className={`sqItem${highlight === index ? " hl" : ""}`}
                                >
                                    {value}
                                    {index === items.length - 1 && (
                                        <span className="sqTag">top</span>
                                    )}
                                </div>
                            );
                        })}

                        <div className="sqBase">bottom</div>
                    </div>
                ) : (
                    <div className="sqQueue" aria-label="Queue, front item first">
                        {items.length === 0 && <div className="sqEmpty">empty queue</div>}

                        {items.map((value, index) => (
                            <div
                                key={`${index}-${value}`}
                                className={`sqItem${highlight === index ? " hl" : ""}`}
                            >
                                {value}

                                {index === 0 && <span className="sqTag">front</span>}

                                {index === items.length - 1 && (
                                    <span className="sqTag rear">rear</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <p className="dsCount">
                    {items.length} / {CAPACITY} items
                </p>
            </div>

            <form className="dsRow" onSubmit={submit}>
                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    className="dsInput"
                    value={input}
                    placeholder="Number (or empty = random)"
                    aria-label="Value to add"
                    onChange={(e) => setInput(e.target.value)}
                />

                <button type="submit" className="dsBtn primary">
                    {isStack ? "Push" : "Enqueue"}
                </button>

                <button type="button" className="dsBtn" onClick={remove}>
                    {isStack ? "Pop" : "Dequeue"}
                </button>

                <button type="button" className="dsBtn" onClick={peek}>
                    Peek
                </button>

                <button type="button" className="dsBtn" onClick={clear}>
                    Clear
                </button>
            </form>

            <ul className="dsLog" aria-live="polite">
                {log.map((message, index) => (
                    <li key={`${index}-${message}`}>{message}</li>
                ))}
            </ul>
        </div>
    );
}

export default StackQueueViz;