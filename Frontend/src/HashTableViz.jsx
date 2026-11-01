import "./Dsa.css";
import { useState } from "react";

const BUCKETS = 7;
const MAX_KEYS = 24;
const SAMPLE = [15, 22, 31, 38, 47, 54];

const hash = (key) => key % BUCKETS;

const emptyTable = () => Array.from({ length: BUCKETS }, () => []);

function HashTableViz() {
    const [table, setTable] = useState(() => {
        const start = emptyTable();

        [10, 25, 18].forEach((key) => start[hash(key)].push(key));

        return start;
    });
    const [input, setInput] = useState("");
    const [log, setLog] = useState(["Insert a key to see which bucket it lands in."]);
    const [highlight, setHighlight] = useState(null);

    const count = table.reduce((sum, chain) => sum + chain.length, 0);
    const say = (message) => setLog((prev) => [message, ...prev].slice(0, 6));

    const readKey = (required) => {
        const text = input.trim();

        if (!text) {
            if (required) {
                say("Type the key first.");
                return null;
            }

            return Math.floor(Math.random() * 1000);
        }

        if (!/^\d{1,3}$/.test(text)) {
            say("Enter a whole number up to 999.");
            return null;
        }

        return Number(text);
    };

    const insert = () => {
        const key = readKey(false);

        if (key === null) return;

        const bucket = hash(key);

        if (table[bucket].includes(key)) {
            setHighlight({ bucket, key });
            say(`${key} is already in bucket ${bucket}. This table stores each key once.`);
            return;
        }

        if (count >= MAX_KEYS) {
            say(`This demo holds ${MAX_KEYS} keys at most.`);
            return;
        }

        const collided = table[bucket].length > 0;

        setTable((prev) =>
            prev.map((chain, index) => (index === bucket ? [...chain, key] : chain))
        );
        setHighlight({ bucket, key });
        setInput("");
        say(
            `hash(${key}) = ${key} % ${BUCKETS} = ${bucket}. ${
                collided
                    ? `Collision! Bucket ${bucket} already holds ${table[bucket].join(", ")}, so ${key} is chained after it.`
                    : "The bucket was empty, so the key goes straight in."
            }`
        );
    };

    const search = () => {
        const key = readKey(true);

        if (key === null) return;

        const bucket = hash(key);
        const position = table[bucket].indexOf(key);

        if (position === -1) {
            setHighlight({ bucket, key: null });
            say(
                `hash(${key}) = ${bucket}. Looked only in bucket ${bucket} (${table[bucket].length} item${table[bucket].length === 1 ? "" : "s"}): ${key} is not in the table.`
            );
            return;
        }

        setHighlight({ bucket, key });
        say(
            `hash(${key}) = ${bucket}. Found ${key} after comparing ${position + 1} item${position === 0 ? "" : "s"} in bucket ${bucket}. No need to look at the other ${BUCKETS - 1} buckets.`
        );
    };

    const remove = () => {
        const key = readKey(true);

        if (key === null) return;

        const bucket = hash(key);

        if (!table[bucket].includes(key)) {
            setHighlight({ bucket, key: null });
            say(`${key} is not in bucket ${bucket}, so there is nothing to delete.`);
            return;
        }

        setTable((prev) =>
            prev.map((chain, index) =>
                index === bucket ? chain.filter((item) => item !== key) : chain
            )
        );
        setHighlight({ bucket, key: null });
        setInput("");
        say(`Deleted ${key} from bucket ${bucket}.`);
    };

    const addSample = () => {
        const next = emptyTable();

        SAMPLE.forEach((key) => next[hash(key)].push(key));
        setTable(next);
        setHighlight(null);
        say("Sample keys added: 15, 22, 31, 38, 47, 54. Several share a bucket (collisions).");
    };

    const clear = () => {
        setTable(emptyTable());
        setHighlight(null);
        say("Table cleared.");
    };

    const loadFactor = count / BUCKETS;

    return (
        <div className="dsViz">
            <div className="dsStage">
                <div className="htTable" aria-label="Hash table">
                    {table.map((chain, bucket) => (
                        <div
                            key={bucket}
                            className={`htRow${highlight?.bucket === bucket ? " hl" : ""}${chain.length > 1 ? " collide" : ""}`}
                        >
                            <span className="htIndex">{bucket}</span>

                            <div className="htChain">
                                {chain.length === 0 && <span className="htEmpty">empty</span>}

                                {chain.map((key, index) => (
                                    <div className="htItem" key={key}>
                                        {index > 0 && (
                                            <span className="llArrow" aria-hidden="true">
                                                →
                                            </span>
                                        )}

                                        <span
                                            className={`htKey${highlight?.key === key && highlight?.bucket === bucket ? " hl" : ""}`}
                                        >
                                            {key}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <p className="dsCount">
                    {count} keys in {BUCKETS} buckets · load factor {loadFactor.toFixed(2)}
                    {loadFactor > 0.75
                        ? " (above 0.75: Java's HashMap would grow the table now)"
                        : ""}
                </p>
            </div>

            <div className="dsRow">
                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    className="dsInput"
                    value={input}
                    placeholder="Key (or empty = random)"
                    aria-label="Key"
                    onChange={(e) => setInput(e.target.value)}
                />

                <button type="button" className="dsBtn primary" onClick={insert}>
                    Insert
                </button>

                <button type="button" className="dsBtn" onClick={search}>
                    Search
                </button>

                <button type="button" className="dsBtn" onClick={remove}>
                    Delete
                </button>

                <button type="button" className="dsBtn" onClick={addSample}>
                    Add sample keys
                </button>

                <button type="button" className="dsBtn" onClick={clear}>
                    Clear
                </button>
            </div>

            <p className="dsNote">
                Here hash(key) = key % {BUCKETS}. Java calls hashCode() and spreads the bits, but the idea is the same.
            </p>

            <ul className="dsLog" aria-live="polite">
                {log.map((message, index) => (
                    <li key={`${index}-${message}`}>{message}</li>
                ))}
            </ul>
        </div>
    );
}

export default HashTableViz;