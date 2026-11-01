import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore
} from "react";

// ===== Browser support =====
// Voice input works in Chrome and Edge. Spoken replies work in most browsers.

const RecognitionAPI =
    typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;

export const isRecognitionSupported = Boolean(RecognitionAPI);

export const isSynthesisSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;


// ===== Languages =====

export const VOICE_LANGUAGES = [
    { code: "en-IN", label: "English (India)" },
    { code: "en-US", label: "English (US)" },
    { code: "en-GB", label: "English (UK)" },
    { code: "hi-IN", label: "हिन्दी (Hindi)" },
    { code: "bn-IN", label: "বাংলা (Bengali)" }
];

const LANGUAGE_STORAGE_KEY = "sigmaGPT_voiceLang";

export const getVoiceLang = () => {
    try {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);

        if (VOICE_LANGUAGES.some((language) => language.code === saved)) {
            return saved;
        }
    } catch {
        // storage is not available: use the default
    }

    const browserLanguage =
        typeof navigator !== "undefined" ? navigator.language : "";

    return VOICE_LANGUAGES.some((language) => language.code === browserLanguage)
        ? browserLanguage
        : "en-IN";
};

export const setVoiceLang = (code) => {
    try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
        // storage is not available: the choice lasts until the page is closed
    }
};


// ===== Speaking (text to speech) =====

let speakingId = null; // which message is being read aloud
let speakToken = 0; // changes whenever speech is stopped or restarted
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
};

// The id of what is being spoken right now (null when silent)
export const useSpeakingId = () =>
    useSyncExternalStore(subscribe, () => speakingId, () => null);

// Voices load a moment after the page opens
if (isSynthesisSupported) {
    window.speechSynthesis.getVoices();
}

const pickVoice = (lang) => {
    const voices = window.speechSynthesis.getVoices();
    const normalise = (value) => value.toLowerCase().replace("_", "-");

    const wanted = normalise(lang);
    const base = wanted.split("-")[0];

    return (
        voices.find((voice) => normalise(voice.lang) === wanted) ||
        voices.find((voice) => normalise(voice.lang).startsWith(base)) ||
        null
    );
};

// Turns a markdown reply into text that sounds natural when spoken
export const markdownToSpeech = (markdown) =>
    String(markdown || "")
        .replace(/```[\s\S]*?```/g, " Code block omitted. ")
        .replace(/```[\s\S]*$/g, " Code block omitted. ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/https?:\/\/\S+/g, "link")
        .replace(/^\s{0,3}#{1,6}\s+/gm, "")
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/^\s*\d+\.\s+/gm, "")
        .replace(/^\s*>\s?/gm, "")
        .replace(/^[\s|:-]{3,}$/gm, "")
        .replace(/\|/g, ", ")
        .replace(/(\*\*|__|\*|~~)/g, "")
        .replace(/\p{Extended_Pictographic}/gu, "")
        .replace(/\n{2,}/g, "\n")
        .trim();

// Browsers cut off long speech, so it is spoken in short pieces
const splitIntoChunks = (text, maxLength = 180) => {
    const pieces = (text.match(/[^.!?।\n]+[.!?।]*/g) || [])
        .map((piece) => piece.trim())
        .filter(Boolean);

    const chunks = [];
    let current = "";

    const flush = () => {
        if (current) {
            chunks.push(current);
            current = "";
        }
    };

    for (const piece of pieces) {
        if (piece.length > maxLength) {
            flush();

            let part = "";

            for (const word of piece.split(/\s+/)) {
                const joined = `${part} ${word}`.trim();

                if (joined.length > maxLength) {
                    if (part) chunks.push(part);
                    part = word;
                } else {
                    part = joined;
                }
            }

            if (part) chunks.push(part);

            continue;
        }

        const joined = `${current} ${piece}`.trim();

        if (joined.length > maxLength) {
            flush();
            current = piece;
        } else {
            current = joined;
        }
    }

    flush();

    return chunks;
};

export const stopSpeaking = () => {
    speakToken += 1;
    speakingId = null;

    if (isSynthesisSupported) {
        window.speechSynthesis.cancel();
    }

    notify();
};

// Reads text aloud. onEnd is called only when the speech finishes by itself
// (not when it is stopped).
export const speak = (text, { id = "assistant", lang = "en-IN", onEnd } = {}) => {
    if (!isSynthesisSupported) {
        onEnd?.();
        return;
    }

    stopSpeaking();

    const chunks = splitIntoChunks(markdownToSpeech(text));

    if (!chunks.length) {
        onEnd?.();
        return;
    }

    const token = ++speakToken;
    const voice = pickVoice(lang);
    let index = 0;

    speakingId = id;
    notify();

    const finish = () => {
        if (token !== speakToken) return;

        speakingId = null;
        notify();
        onEnd?.();
    };

    const next = () => {
        if (token !== speakToken) return;

        if (index >= chunks.length) {
            finish();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index++]);
        utterance.lang = lang;

        if (voice) {
            utterance.voice = voice;
        }

        utterance.onend = next;
        utterance.onerror = (event) => {
            if (token !== speakToken) return;

            // Stopped on purpose
            if (event.error === "canceled" || event.error === "interrupted") {
                return;
            }

            // The browser refused to speak (for example, it needs a click first)
            finish();
        };

        window.speechSynthesis.speak(utterance);
    };

    // Chrome sometimes ignores speech that starts right after a cancel
    setTimeout(next, 60);
};


// ===== Listening (speech to text) =====

export const describeSpeechError = (code) => {
    switch (code) {
        case "not-allowed":
        case "service-not-allowed":
            return "Microphone access was blocked. Allow the microphone for this site in your browser settings and try again.";
        case "audio-capture":
            return "No microphone was found. Connect one and try again.";
        case "network":
            return "Voice recognition needs an internet connection. Check your connection and try again.";
        case "language-not-supported":
            return "This language is not supported for voice input in your browser.";
        default:
            return "Voice input stopped unexpectedly. Please try again.";
    }
};

// onInterim(text) is called while the person is still speaking.
// onEnd({ text, error }) is called once, when listening stops by itself
// or after stop(). It is not called after abort().
export const useSpeechRecognition = ({ lang, onInterim, onEnd }) => {
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef(null);
    const handlersRef = useRef({ onInterim, onEnd });

    // Always call the newest versions of the callbacks
    useEffect(() => {
        handlersRef.current = { onInterim, onEnd };
    });

    const start = useCallback(() => {
        if (!RecognitionAPI || recognitionRef.current) {
            return false;
        }

        const recognition = new RecognitionAPI();
        recognition.lang = lang;
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        let transcript = "";
        let finalText = "";
        let errorCode = null;

        recognition.onresult = (event) => {
            let finals = "";
            let interim = "";

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];

                if (result.isFinal) {
                    finals += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            finalText = finals;
            transcript = finals + interim;

            handlersRef.current.onInterim?.(transcript.trim());
        };

        recognition.onerror = (event) => {
            errorCode = event.error;
        };

        recognition.onend = () => {
            if (recognitionRef.current === recognition) {
                recognitionRef.current = null;
            }

            setListening(false);

            // Stopped by abort(): stay quiet
            if (errorCode === "aborted") return;

            handlersRef.current.onEnd?.({
                text: (finalText || transcript).trim(),
                error: errorCode
            });
        };

        try {
            recognition.start();
        } catch {
            return false;
        }

        recognitionRef.current = recognition;
        setListening(true);

        return true;
    }, [lang]);

    // Finishes listening and delivers what was heard
    const stop = useCallback(() => {
        recognitionRef.current?.stop();
    }, []);

    // Cancels listening and throws away what was heard
    const abort = useCallback(() => {
        recognitionRef.current?.abort();
    }, []);

    useEffect(() => () => recognitionRef.current?.abort(), []);

    return { listening, start, stop, abort };
};