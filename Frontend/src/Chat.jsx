import "./Chat.css";
import React, {
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import AttachmentList from "./AttachmentPreview.jsx";
import RunPanel from "./RunPanel.jsx";
import VisualizerModal from "./VisualizerModal.jsx";
import { getRunLanguage } from "./run.js";
import { ALGORITHMS, detectAlgorithm } from "./algorithms.js";
import {
    getVoiceLang,
    isSynthesisSupported,
    speak,
    stopSpeaking,
    useSpeakingId
} from "./voice.js";

function CodeBlock({ node, children, ...props }) {
    const preRef = useRef(null);
    const [copied, setCopied] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const codeElement = React.Children.toArray(children)[0];
    const runLanguage = getRunLanguage(codeElement?.props?.className);

    const getCode = () => preRef.current?.innerText ?? "";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(getCode());
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error("Copy failed:", err);
        }
    };

    return (
        <div className="codeBlock">
            <div className="codeActions">
                {runLanguage && (
                    <button
                        type="button"
                        className="runBtn"
                        onClick={() => setPanelOpen((open) => !open)}
                        aria-expanded={panelOpen}
                        title={`Run this ${runLanguage.label} code`}
                    >
                        <i className="fa-solid fa-play"></i> Run
                    </button>
                )}

                <button type="button" className="copyBtn" onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>

            <pre ref={preRef} {...props}>
                {children}
            </pre>

            {runLanguage && panelOpen && (
                <RunPanel
                    language={runLanguage}
                    getCode={getCode}
                    onClose={() => setPanelOpen(false)}
                />
            )}
        </div>
    );
}

const markdownComponents = {
    pre: CodeBlock
};

const MarkdownMessage = React.memo(function MarkdownMessage({ content }) {
    return (
        <ReactMarkdown
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
        >
            {content}
        </ReactMarkdown>
    );
});

function AssistantActions({ content, speechId }) {
    const [copied, setCopied] = useState(false);
    const [visualizing, setVisualizing] = useState(false);
    const speakingId = useSpeakingId();
    const isSpeaking = speakingId === speechId;

    const algorithmKey = useMemo(() => detectAlgorithm(content), [content]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error("Copy failed:", err);
        }
    };

    const handleSpeak = () => {
        if (isSpeaking) {
            stopSpeaking();
            return;
        }

        speak(content, { id: speechId, lang: getVoiceLang() });
    };

    return (
        <div className={isSpeaking ? "msgActions active" : "msgActions"}>
            <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy reply"
                title={copied ? "Copied!" : "Copy reply"}
            >
                <i className={copied ? "fa-solid fa-check" : "fa-solid fa-copy"}></i>
            </button>

            {isSynthesisSupported && (
                <button
                    type="button"
                    onClick={handleSpeak}
                    aria-label={isSpeaking ? "Stop reading aloud" : "Read aloud"}
                    title={isSpeaking ? "Stop reading aloud" : "Read aloud"}
                >
                    <i
                        className={
                            isSpeaking
                                ? "fa-solid fa-stop"
                                : "fa-solid fa-volume-high"
                        }
                    ></i>
                </button>
            )}

            {algorithmKey && (
                <button
                    type="button"
                    className="vizAction"
                    onClick={() => setVisualizing(true)}
                    aria-label={`Visualize ${ALGORITHMS[algorithmKey].name}`}
                    title={`Watch ${ALGORITHMS[algorithmKey].name} step by step`}
                >
                    <i className="fa-solid fa-chart-simple"></i>
                    Visualize
                </button>
            )}

            {visualizing && (
                <VisualizerModal
                    initialAlgorithm={algorithmKey}
                    onClose={() => setVisualizing(false)}
                />
            )}
        </div>
    );
}

const getScrollParent = (node) => {
    let element = node?.parentElement;

    while (element) {
        const { overflowY } = getComputedStyle(element);

        if (overflowY === "auto" || overflowY === "scroll") {
            return element;
        }

        element = element.parentElement;
    }

    return null;
};
   const STARTERS = [
       {
           icon: "🧠",
           title: "Explain recursion",
           text: "Explain recursion with a simple Java example.",
           mode: "learn"
       },
       {
           icon: "🧪",
           title: "Practice arrays",
           text: "Give me an array problem to practice. Hints only, no full solution.",
           mode: "practice"
       },
       {
           icon: "🎤",
           title: "Mock interview",
           text: "Start a mock Java interview.",
           mode: "interview"
       },
       {
           icon: "💻",
           title: "Debug my code",
           text: "Help me debug this code: ",
           mode: "developer"
       }
   ];
function Chat() {
           const { newChat, prevChats, currThreadId, setPrompt, setMode } =
           useContext(MyContext);

    const bottomRef = useRef(null);
    const stickToBottomRef = useRef(true);

    useEffect(() => {
        const container = getScrollParent(bottomRef.current);

        if (!container) {
            return;
        }

        const handleScroll = () => {
            const distanceFromBottom =
                container.scrollHeight -
                container.scrollTop -
                container.clientHeight;

            stickToBottomRef.current = distanceFromBottom < 80;
        };

        container.addEventListener("scroll", handleScroll);

        return () => container.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const lastChat = prevChats?.[prevChats.length - 1];

        if (lastChat?.role === "user") {
            stickToBottomRef.current = true;
        }

        if (stickToBottomRef.current) {
            bottomRef.current?.scrollIntoView({ block: "end" });
        }
    }, [prevChats]);

    return (
        <div className="chats">
                          {newChat && (
                   <div className="newChatMessage">
                       <h1>Start a New Chat!</h1>
                       <p>Ask anything and start exploring with SigmaGPT.</p>

                       <div className="starterGrid">
                           {STARTERS.map((starter) => (
                               <button
                                   type="button"
                                   key={starter.title}
                                   className="starterCard"
                                   onClick={() => {
                                       setMode(starter.mode);
                                       setPrompt(starter.text);
                                   }}
                               >
                                   <span className="starterIcon">{starter.icon}</span>

                                   <span className="starterText">
                                       <strong>{starter.title}</strong>
                                       <small>{starter.text}</small>
                                   </span>
                               </button>
                           ))}
                       </div>
                   </div>
               )}

            {prevChats?.map((chat, idx) => {
                const attachments = chat.attachments || [];

                return (
                    <div
                        className={
                            chat.role === "user" ? "userDiv" : "gptDiv"
                        }
                        key={`${idx}-${chat.role}`}
                    >
                        {chat.role === "user" ? (
                            attachments.length > 0 ? (
                                <div className="userBubbleWrap">
                                    <AttachmentList attachments={attachments} />

                                    {chat.content && (
                                        <p className="userMessage">
                                            {chat.content}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="userMessage">{chat.content}</p>
                            )
                        ) : (
                            <>
                                <MarkdownMessage content={chat.content} />

                                {chat.content && (
                                    <AssistantActions
                                        content={chat.content}
                                        speechId={`${currThreadId}:${idx}`}
                                    />
                                )}
                            </>
                        )}
                    </div>
                );
            })}

            <div ref={bottomRef} />
        </div>
    );
}

export default Chat;