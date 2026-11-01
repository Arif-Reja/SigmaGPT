import './App.css';
import Sidebar from './Sidebar.jsx';
import ChatWindow from './ChatWindow.jsx';
import DsaPage from './DsaPage.jsx';
import WelcomePage from './WelcomePage.jsx';
import AuthPage from './AuthPage.jsx';
import { MyContext } from './MyContext.jsx';
import {
  apiFetch,
  getToken,
  saveToken,
  clearToken,
  UNAUTHORIZED_EVENT
} from './auth.js';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from 'react';

const THREAD_STORAGE_KEY = "sigmaGPT_currentThreadId";

function App() {
  const [prompt, setPrompt] = useState("");

  const [reply, setReply] = useState(null);

  const [currThreadId, setCurrThreadId] = useState(() => {
    const savedThreadId = localStorage.getItem(THREAD_STORAGE_KEY);
    return savedThreadId || uuidv4();
  });

  const [prevChats, setPrevChats] = useState([]);
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);
  const [mode, setMode] = useState("learn");
  const [socraticMode, setSocraticMode] = useState(false);

  const [view, setView] = useState("chat");

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [startupError, setStartupError] = useState("");

  const [authView, setAuthView] = useState("welcome");

  const resetChatState = () => {
    setCurrThreadId(uuidv4());
    setPrevChats([]);
    setNewChat(true);
    setAllThreads([]);
    setPrompt("");
    setReply(null);
    setView("chat");
  };

  const handleAuthenticated = ({ token, user: loggedInUser }) => {
    saveToken(token);
    resetChatState();
    setStartupError("");
    setUser(loggedInUser);
  };

  const logout = () => {
    clearToken();
    resetChatState();
    setUser(null);
    setAuthView("welcome");
  };

  const providerValues = {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    setCurrThreadId,
    prevChats,
    setPrevChats,
    newChat,
    setNewChat,
    allThreads,
    setAllThreads,
    mode,
    setMode,
    socraticMode,
    setSocraticMode,
    view,
    setView,
    user,
    logout
  };

  useEffect(() => {
    localStorage.setItem(THREAD_STORAGE_KEY, currThreadId);
  }, [currThreadId]);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      if (!getToken()) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await apiFetch("/api/auth/me");

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          clearToken();
        }
      } catch {
        if (!cancelled) {
          setStartupError(
            "Cannot reach the server. Check that the backend is running."
          );
          setAuthView("login");
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      resetChatState();
      setUser(null);
      setAuthView("login");
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="app">
        <div className="authLoading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        {authView === "welcome" ? (
          <WelcomePage
            onLogin={() => setAuthView("login")}
            onSignUp={() => setAuthView("register")}
          />
        ) : (
          <AuthPage
            key={authView}
            initialMode={authView}
            onBack={() => setAuthView("welcome")}
            onAuthenticated={handleAuthenticated}
            notice={startupError}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <MyContext.Provider value={providerValues}>
        <Sidebar />

        <div className={view === "chat" ? "mainPane" : "mainPane inactive"}>
          <ChatWindow />
        </div>

        {view === "dsa" && <DsaPage />}
      </MyContext.Provider>
    </div>
  );
}

export default App;