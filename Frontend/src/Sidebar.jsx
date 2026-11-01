import "./Sidebar.css";
import SigmaMark from "./SigmaMark.jsx";
import { useContext, useEffect, useRef, useState } from "react";
import { MyContext } from "./MyContext.jsx";
import { apiFetch } from "./auth.js";
import ProgressButton from "./ProgressButton.jsx";
import DsaButton from "./DsaButton.jsx";
import { v4 as uuidv4 } from "uuid";
function Sidebar() {
    const {
        allThreads,
        setAllThreads,
        currThreadId,
        setNewChat,
        setPrompt,
        reply,
        setReply,
        setCurrThreadId,
        setPrevChats,
        setView
    } = useContext(MyContext);

    const [searchTerm, setSearchTerm] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [error, setError] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const cancelRenameRef = useRef(false);

    const getAllThreads = async () => {
        try {
            const response = await apiFetch("/api/thread");

            if (!response.ok) {
                throw new Error("Failed to fetch conversations");
            }

            const res = await response.json();

            if (!Array.isArray(res)) {
                throw new Error("Invalid conversation list received");
            }

            const filteredData = res.map((thread) => ({
                threadId: thread.threadId,
                title: thread.title,
                pinned: Boolean(thread.pinned)
            }));

            setAllThreads(filteredData);
        } catch (err) {
            console.error("Fetch threads error:", err);
        }
    };

    // Load the conversation currently selected when the app opens.
    useEffect(() => {
        let cancelled = false;

        const restoreCurrentThread = async () => {
            try {
                const response = await apiFetch(
                    `/api/thread/${encodeURIComponent(currThreadId)}`
                );

                if (cancelled) return;

                // A new, empty thread has not been saved to MongoDB yet.
                if (response.status === 404) {
                    setPrevChats([]);
                    setNewChat(true);
                    setReply(null);
                    return;
                }

                if (!response.ok) {
                    throw new Error("Failed to restore conversation");
                }

                const thread = await response.json();

                if (cancelled) return;

                setPrevChats(
                    Array.isArray(thread.messages) ? thread.messages : []
                );
                setNewChat(false);
                setReply(null);
            } catch (err) {
                if (!cancelled) {
                    console.error("Restore conversation error:", err);
                }
            }
        };

        getAllThreads();
        restoreCurrentThread();

        return () => {
            cancelled = true;
        };
        // Run only when Sidebar mounts.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refresh the list after every new reply, so new chats and titles appear
    useEffect(() => {
        if (reply !== null && reply !== "") {
            getAllThreads();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reply]);

    // Close the mobile menu with the Escape key
    useEffect(() => {
        if (!menuOpen) return;

        const handleEscape = (e) => {
            if (e.key === "Escape") {
                setMenuOpen(false);
            }
        };

        document.addEventListener("keydown", handleEscape);

        return () => document.removeEventListener("keydown", handleEscape);
    }, [menuOpen]);

    // Start a fresh conversation.
    const createNewChat = () => {
        const newThreadId = uuidv4();

        setMenuOpen(false);
        setView("chat");
        setCurrThreadId(newThreadId);
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setPrevChats([]);
        setError("");
    };

    // Open a previously saved conversation.
    const changeThread = async (newThreadId) => {
        setMenuOpen(false);
        setView("chat");
        if (newThreadId === currThreadId) return;

        setCurrThreadId(newThreadId);
        setPrompt("");
        setReply(null);
        setPrevChats([]);
        setNewChat(false);
        setError("");

        try {
            const response = await apiFetch(
                `/api/thread/${encodeURIComponent(newThreadId)}`
            );

            if (!response.ok) {
                throw new Error(
                    response.status === 404
                        ? "Conversation not found"
                        : "Failed to load conversation"
                );
            }

            const thread = await response.json();

            // Ignore the response if another conversation was selected.
            if (thread.threadId !== newThreadId) return;

            setPrevChats(
                Array.isArray(thread.messages) ? thread.messages : []
            );
        } catch (err) {
            console.error("Change thread error:", err);
            setError("Could not load this conversation. Please try again.");
            setNewChat(true);
        }
    };

    // Delete a saved conversation.
    const deleteThread = async (threadId) => {
        if (!window.confirm("Delete this chat? This cannot be undone.")) {
            return;
        }

        try {
            const response = await apiFetch(
                `/api/thread/${encodeURIComponent(threadId)}`,
                { method: "DELETE" }
            );

            const res = await response.json();

            if (!response.ok) {
                throw new Error(res.error || "Failed to delete conversation");
            }

            setAllThreads((prev) =>
                prev.filter((thread) => thread.threadId !== threadId)
            );

            if (threadId === currThreadId) {
                createNewChat();
            }
        } catch (err) {
            console.error("Delete thread error:", err);
            setError(err.message || "Could not delete conversation.");
        }
    };

    // Pin or unpin a conversation.
    const togglePin = async (thread) => {
        try {
            const response = await apiFetch(
                `/api/thread/${encodeURIComponent(thread.threadId)}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ pinned: !thread.pinned })
                }
            );

            const res = await response.json();

            if (!response.ok) {
                throw new Error(res.error || "Failed to update conversation");
            }

            // Reload so pinned chats move to the top
            await getAllThreads();
        } catch (err) {
            console.error("Pin thread error:", err);
            setError(err.message || "Could not update conversation.");
        }
    };

    // Rename a conversation.
    const startRename = (thread) => {
        cancelRenameRef.current = false;
        setEditingId(thread.threadId);
        setEditTitle(thread.title);
    };

    const cancelRename = () => {
        cancelRenameRef.current = true;
        setEditingId(null);
    };

    const saveRename = async (thread) => {
        const newTitle = editTitle.trim();

        setEditingId(null);

        if (!newTitle || newTitle === thread.title) return;

        try {
            const response = await apiFetch(
                `/api/thread/${encodeURIComponent(thread.threadId)}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ title: newTitle })
                }
            );

            const res = await response.json();

            if (!response.ok) {
                throw new Error(res.error || "Failed to rename conversation");
            }

            setAllThreads((prev) =>
                prev.map((item) =>
                    item.threadId === thread.threadId
                        ? { ...item, title: res.title }
                        : item
                )
            );
        } catch (err) {
            console.error("Rename thread error:", err);
            setError(err.message || "Could not rename conversation.");
        }
    };

    // Search by title
    const visibleThreads = allThreads.filter((thread) =>
        (thread.title || "")
            .toLowerCase()
            .includes(searchTerm.trim().toLowerCase())
    );

    return (
        <>
            {/* Menu button (only visible on small screens) */}
            <button
                type="button"
                className={menuOpen ? "menuToggle hidden" : "menuToggle"}
                onClick={() => setMenuOpen(true)}
                aria-label="Open chat list"
                aria-expanded={menuOpen}
            >
                <i className="fa-solid fa-bars"></i>
            </button>

            {/* Dark layer behind the menu (only visible on small screens) */}
            <div
                className={
                    menuOpen
                        ? "sidebarBackdrop visible"
                        : "sidebarBackdrop"
                }
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
            ></div>

            <section className={menuOpen ? "sidebar open" : "sidebar"}>
                <button
                    type="button"
                    className="newChatBtn"
                    onClick={createNewChat}
                >
                       <SigmaMark size={30} />
                                       <span className="newChatLabel">New chat</span>
                    <i className="fa-solid fa-pen-to-square"></i>
                </button>

                <input
                    type="text"
                    className="searchBox"
                    placeholder="Search chats..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search chats"
                />

                {error && (
                    <div className="sidebarError" role="alert">
                        <span>{error}</span>
                        <button
                            type="button"
                            className="iconBtn"
                            onClick={() => setError("")}
                            aria-label="Dismiss error"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                )}

                <ul className="history">
                    {visibleThreads.length === 0 && (
                        <li className="emptyHistory">
                            {searchTerm.trim()
                                ? "No chats found"
                                : "No chats yet"}
                        </li>
                    )}

                    {visibleThreads.map((thread) => (
                        <li
                            key={thread.threadId}
                            onClick={() => changeThread(thread.threadId)}
                            onKeyDown={(e) => {
                                // Only when the row itself is focused,
                                // not the buttons or rename box inside it
                                if (
                                    e.target === e.currentTarget &&
                                    (e.key === "Enter" || e.key === " ")
                                ) {
                                    e.preventDefault();
                                    changeThread(thread.threadId);
                                }
                            }}
                            tabIndex={editingId === thread.threadId ? -1 : 0}
                            aria-current={
                                thread.threadId === currThreadId
                                    ? "true"
                                    : undefined
                            }
                            className={
                                thread.threadId === currThreadId
                                    ? "highlighted"
                                    : ""
                            }
                        >
                            {editingId === thread.threadId ? (
                                <input
                                    type="text"
                                    className="renameInput"
                                    value={editTitle}
                                    maxLength={100}
                                    autoFocus
                                    aria-label="Rename chat"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                        setEditTitle(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.currentTarget.blur();
                                        } else if (e.key === "Escape") {
                                            cancelRename();
                                        }
                                    }}
                                    onBlur={() => {
                                        if (cancelRenameRef.current) {
                                            cancelRenameRef.current = false;
                                            return;
                                        }

                                        saveRename(thread);
                                    }}
                                />
                            ) : (
                                <>
                                    <span className="threadTitle">
                                        {thread.pinned && (
                                            <i className="fa-solid fa-thumbtack pinnedIcon"></i>
                                        )}
                                        {thread.title}
                                    </span>

                                    <span className="threadActions">
                                        <button
                                            type="button"
                                            className="iconBtn"
                                            title={
                                                thread.pinned
                                                    ? "Unpin chat"
                                                    : "Pin chat"
                                            }
                                            aria-label={
                                                thread.pinned
                                                    ? "Unpin chat"
                                                    : "Pin chat"
                                            }
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                togglePin(thread);
                                            }}
                                        >
                                            <i className="fa-solid fa-thumbtack"></i>
                                        </button>

                                        <button
                                            type="button"
                                            className="iconBtn"
                                            title="Rename chat"
                                            aria-label="Rename chat"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startRename(thread);
                                            }}
                                        >
                                            <i className="fa-solid fa-pen"></i>
                                        </button>

                                        <button
                                            type="button"
                                            className="iconBtn danger"
                                            title="Delete chat"
                                            aria-label="Delete chat"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteThread(thread.threadId);
                                            }}
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </span>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
                                       <ProgressButton />
      <DsaButton onNavigate={() => setMenuOpen(false)} />
                <div className="sign">
                    <p>By Arif Reja &hearts;</p>
                </div>
            </section>
        </>
    );
}

export default Sidebar;