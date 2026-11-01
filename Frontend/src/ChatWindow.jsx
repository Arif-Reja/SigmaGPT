import './ChatWindow.css';
import Chat from './Chat.jsx';
import ModeSelector from './ModeSelector.jsx';
import InterviewBar from './InterviewBar.jsx';
import ResumeBar from './ResumeBar.jsx';
import { MyContext } from './MyContext.jsx';
import { apiFetch } from './auth.js';
import {
  ACCEPT,
  MAX_ATTACHMENTS,
  fileIconClass,
  formatSize,
  getFileKind,
  resizeImage,
  uploadAttachment,
  validateFile
} from './files.js';
import {
  VOICE_LANGUAGES,
  describeSpeechError,
  getVoiceLang,
  isRecognitionSupported,
  isSynthesisSupported,
  setVoiceLang,
  speak,
  stopSpeaking,
  useSpeakingId,
  useSpeechRecognition
} from './voice.js';
import { v4 as uuidv4 } from 'uuid';
import { useContext, useEffect, useRef, useState } from 'react';
import { ScaleLoader } from 'react-spinners';

const MAX_MESSAGE_LENGTH = 8000;
const CONTINUE_MESSAGE = 'Please continue from where you stopped.';
const MAX_SILENT_RETRIES = 3;

const joinText = (base, addition) =>
  [base.trim(), addition.trim()].filter(Boolean).join(' ');

const toMessageAttachments = (items) =>
  items.map((item) => ({
    attachmentId: item.id,
    name: item.name,
    kind: item.kind,
    mimeType: item.mimeType,
    size: item.size,
    previewUrl: item.previewUrl
  }));

function ChatWindow() {
  const {
    prompt,
    setPrompt,
    currThreadId,
    setCurrThreadId,
    prevChats,
    setPrevChats,
    newChat,
    setNewChat,
    setReply,
    mode,
    socraticMode,
    user,
    logout
  } = useContext(MyContext);

  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceLang, setVoiceLangState] = useState(getVoiceLang);

  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const currentThreadRef = useRef(currThreadId);
  currentThreadRef.current = currThreadId;

  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const wasLoadingRef = useRef(false);
  const userIconRef = useRef(null);
  const dropDownRef = useRef(null);

  const voiceModeRef = useRef(false);
  const silentRetriesRef = useRef(0);
  const dictationBaseRef = useRef('');
  const runChatRef = useRef(null);

  const speakingId = useSpeakingId();
  useEffect(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;

    setLoading(false);
    setStreaming(false);
    setTruncated(false);
    setError('');

    attachmentsRef.current.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setAttachments([]);
  }, [currThreadId]);
  useEffect(() => {
    if (wasLoadingRef.current && !loading) {
      inputRef.current?.focus();
    }

    wasLoadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      const insideIcon = userIconRef.current?.contains(e.target);
      const insideMenu = dropDownRef.current?.contains(e.target);

      if (!insideIcon && !insideMenu) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const {
    listening,
    start: startListening,
    stop: stopListening,
    abort: abortListening
  } = useSpeechRecognition({
    lang: voiceLang,
    onInterim: (text) => setPrompt(joinText(dictationBaseRef.current, text)),
    onEnd: (result) => handleRecognitionEnd(result)
  });
  useEffect(() => {
    stopSpeaking();
    abortListening();
  }, [currThreadId, abortListening]);

  useEffect(
    () => () => {
      stopSpeaking();
      abortListening();
      abortRef.current?.abort();
    },
    [abortListening]
  );

  const beginListening = (base) => {
    dictationBaseRef.current = base;

    if (!startListening()) {
      setError('Could not start the microphone. Please try again.');
    }
  };

  const handleRecognitionEnd = ({ text, error: speechError }) => {
    if (speechError === 'no-speech' || (!speechError && !text)) {
      setPrompt(dictationBaseRef.current);

      if (voiceModeRef.current) {
        silentRetriesRef.current += 1;

        if (silentRetriesRef.current < MAX_SILENT_RETRIES) {
          beginListening('');
          return;
        }

        silentRetriesRef.current = 0;
        setError("I didn't hear anything. Tap the microphone to try again.");
      }

      return;
    }

    if (speechError) {
      setPrompt(dictationBaseRef.current);
      setError(describeSpeechError(speechError));
      if (
        voiceModeRef.current &&
        (speechError === 'not-allowed' || speechError === 'service-not-allowed')
      ) {
        voiceModeRef.current = false;
        setVoiceMode(false);
      }

      return;
    }

    silentRetriesRef.current = 0;

    if (voiceModeRef.current) {
      runChatRef.current?.({
        text,
        fromInput: true,
        attachments: attachmentsRef.current.filter(
          (item) => item.status === 'ready'
        )
      });
    } else {
      setPrompt(joinText(dictationBaseRef.current, text));
      inputRef.current?.focus();
    }
  };

  const speakReply = (text) => {
    const listenAgain = () => {
      if (voiceModeRef.current) {
        beginListening('');
      }
    };

    if (!isSynthesisSupported) {
      listenAgain();
      return;
    }

    speak(text, { id: 'voice-reply', lang: voiceLang, onEnd: listenAgain });
  };

  const toggleVoiceMode = () => {
    if (voiceModeRef.current) {
      exitVoiceMode();
      return;
    }

    voiceModeRef.current = true;
    silentRetriesRef.current = 0;
    setVoiceMode(true);
    setError('');
    stopSpeaking();
    beginListening('');
  };

  const exitVoiceMode = () => {
    voiceModeRef.current = false;
    setVoiceMode(false);
    abortListening();
    stopSpeaking();
    setPrompt('');
  };

  const handleMicClick = () => {
    if (listening) {
      stopListening();
      return;
    }

    if (loading) return;

    stopSpeaking();
    silentRetriesRef.current = 0;
    beginListening(voiceModeRef.current ? '' : prompt);
  };
  const skipSpeaking = () => {
    stopSpeaking();
    silentRetriesRef.current = 0;
    beginListening('');
  };

  const handleVoiceLangChange = (e) => {
    setVoiceLang(e.target.value);
    setVoiceLangState(e.target.value);
  };


  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);

    if (!files.length) return;

    setError('');

    const room = Math.max(MAX_ATTACHMENTS - attachments.length, 0);

    if (files.length > room) {
      setError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
    }

    files.slice(0, room).forEach((file) => {
      const problem = validateFile(file);

      if (problem) {
        setError(problem);
        return;
      }

      const tempId = uuidv4();
      const kind = getFileKind(file);

      setAttachments((prev) => [
        ...prev,
        {
          tempId,
          id: null,
          name: file.name,
          size: file.size,
          kind,
          mimeType: file.type,
          previewUrl: kind === 'image' ? URL.createObjectURL(file) : null,
          status: 'uploading',
          error: ''
        }
      ]);

      (async () => {
        try {
          const toUpload = kind === 'image' ? await resizeImage(file) : file;
          const saved = await uploadAttachment(toUpload);

          setAttachments((prev) =>
            prev.map((item) =>
              item.tempId === tempId
                ? {
                    ...item,
                    id: saved.attachmentId,
                    name: saved.name,
                    size: saved.size,
                    mimeType: saved.mimeType,
                    status: 'ready'
                  }
                : item
            )
          );
        } catch (err) {
          setAttachments((prev) =>
            prev.map((item) =>
              item.tempId === tempId
                ? {
                    ...item,
                    status: 'error',
                    error:
                      err instanceof TypeError
                        ? 'Cannot reach the server.'
                        : err.message || 'Upload failed.'
                  }
                : item
            )
          );
        }
      })();
    });
  };

  const removeAttachment = (tempId) => {
    setAttachments((prev) => {
      const removed = prev.find((item) => item.tempId === tempId);

      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      return prev.filter((item) => item.tempId !== tempId);
    });
  };
  const handlePaste = (e) => {
    const files = Array.from(e.clipboardData?.files || []);

    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const uploading = attachments.some((item) => item.status === 'uploading');
  const readyAttachments = attachments.filter(
    (item) => item.status === 'ready'
  );
  const canSend = !uploading && (prompt.trim() || readyAttachments.length > 0);
  const runChat = async ({
    text = '',
    regenerate = false,
    fromInput = false,
    attachments: sentAttachments = []
  } = {}) => {
    if (loading) return;

    const messageText = text.trim();

    if (!regenerate && !messageText && !sentAttachments.length) return;

    const lastChat = prevChats[prevChats.length - 1];

    if (regenerate && lastChat?.role !== 'assistant') return;

    const threadIdForRequest = currThreadId;
    const wasNewChat = newChat;
    const removedReply = regenerate ? lastChat : null;
    const requestId = ++requestIdRef.current;

    const controller = new AbortController();
    abortRef.current = controller;
    const isCurrent = () =>
      requestId === requestIdRef.current &&
      currentThreadRef.current === threadIdForRequest;

    setLoading(true);
    setStreaming(false);
    setError('');
    setTruncated(false);
    setNewChat(false);
    setReply(null);

    if (regenerate) {
      setPrevChats(prev => prev.slice(0, -1));
    } else {
      setPrevChats(prev => [
        ...prev,
        {
          role: 'user',
          content: messageText,
          attachments: toMessageAttachments(sentAttachments)
        }
      ]);

      if (fromInput) {
        setPrompt('');
        setAttachments([]);
      }
    }

    let streamedText = '';
    let assistantShown = false;
    let frameId = null;
    const render = () => {
      frameId = null;

      if (!isCurrent()) return;

      const isFirst = !assistantShown;
      const content = streamedText;

      assistantShown = true;
      setStreaming(true);

      setPrevChats(prev =>
        isFirst
          ? [...prev, { role: 'assistant', content }]
          : [...prev.slice(0, -1), { role: 'assistant', content }]
      );
    };

    const scheduleRender = () => {
      if (frameId === null) {
        frameId = requestAnimationFrame(render);
      }
    };

    const renderNow = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }

      render();
    };

    try {
      const response = await apiFetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageText,
          threadId: threadIdForRequest,
          mode,
          socraticMode,
          regenerate,
          attachmentIds: sentAttachments.map(item => item.id)
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        let res = {};

        try {
          res = await response.json();
        } catch {
          res = {};
        }

        throw new Error(res.error || `Request failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error('Streaming is not supported by this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      let finished = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop();

        for (const rawEvent of events) {
          const line = rawEvent.trim();

          if (!line.startsWith('data:')) continue;

          let data;

          try {
            data = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.token) {
            streamedText += data.token;
            scheduleRender();
          }

          if (data.done) {
            finished = data;
          }
        }
      }

      if (!isCurrent()) return;

      if (!streamedText.trim()) {
        throw new Error('The AI returned an empty response. Please try again.');
      }

      renderNow();
      setReply(streamedText);

      if (finished) {
        setTruncated(Boolean(finished.truncated));
        if (voiceModeRef.current) {
          speakReply(streamedText);
        }
      } else {
        setTruncated(true);
        setError('Connection lost. The reply may be incomplete.');
      }
    } catch (err) {
      console.error('Chat request error:', err);

      if (!isCurrent()) return;

      const aborted = err.name === 'AbortError';
      if (streamedText.trim()) {
        renderNow();
        setReply(streamedText);
        setTruncated(true);

        if (!aborted) {
          setError(
            err instanceof TypeError
              ? 'Connection lost. The reply may be incomplete.'
              : err.message || 'The reply was interrupted.'
          );
        }

        return;
      }
      const hadPlaceholder = assistantShown;

      setPrevChats(prev => {
        const next = hadPlaceholder ? prev.slice(0, -1) : prev;

        if (regenerate) {
          return removedReply ? [...next, removedReply] : next;
        }

        const last = next[next.length - 1];

        return last?.role === 'user' && last.content === messageText
          ? next.slice(0, -1)
          : next;
      });

      if (!regenerate) {
        if (fromInput) {
          setPrompt(messageText);
          setAttachments(sentAttachments);
        }

        if (wasNewChat) {
          setNewChat(true);
        }
      }
      if (!aborted) {
        setError(
          err instanceof TypeError
            ? 'Cannot reach the server. Check that the backend is running.'
            : err.message || 'Unable to get a response. Please try again.'
        );
      }
    } finally {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      if (requestId === requestIdRef.current) {
        setLoading(false);
        setStreaming(false);

        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    }
  };

  runChatRef.current = runChat;

  const stopGeneration = () => {
    abortRef.current?.abort();
  };

  const handleSend = () => {
    if (uploading) {
      setError('Please wait for your files to finish uploading.');
      return;
    }

    abortListening();

    runChat({
      text: prompt,
      fromInput: true,
      attachments: readyAttachments
    });
  };

  const handleRegenerate = () => {
    runChat({ regenerate: true });
  };

  const handleContinue = () => {
    runChat({ text: CONTINUE_MESSAGE });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      if (canSend) {
        handleSend();
      }
    }
  };

  const handleProfileClick = () => {
    setIsOpen(prev => !prev);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };
     const startNewChat = () => {
       setCurrThreadId(uuidv4());
       setPrevChats([]);
       setReply(null);
       setNewChat(true);
       setPrompt('');
       setError('');
     };

  const lastChat = prevChats[prevChats.length - 1];
  const canRegenerate = !loading && lastChat?.role === 'assistant';
  const voiceState = !voiceMode
    ? null
    : loading
      ? 'thinking'
      : speakingId
        ? 'speaking'
        : listening
          ? 'listening'
          : 'idle';

  const voiceLabels = {
    listening: 'Listening...',
    thinking: streaming ? 'Answering...' : 'Thinking...',
    speaking: 'Speaking...',
    idle: 'Tap the microphone to talk'
  };

  const voiceLangLabel =
    VOICE_LANGUAGES.find((language) => language.code === voiceLang)?.label ||
    voiceLang;

  return (
    <div className="chatWindow">
      <div className="navbar">
        <div className="logoTitle">
          <span>
            SigmaGPT
            <i className="fa-solid fa-chevron-down"></i>
          </span>
        </div>

        <div className="navRight">
           <button
            type="button"
            className="newChatNav"
            onClick={startNewChat}
            title="New chat"
            aria-label="New chat"
          >
            <i className="fa-solid fa-pen-to-square"></i>
            <span>New chat</span>
          </button>
          {isRecognitionSupported && (
            <button
              type="button"
              className={voiceMode ? 'voiceToggle active' : 'voiceToggle'}
              onClick={toggleVoiceMode}
              aria-pressed={voiceMode}
              title={voiceMode ? 'End voice chat' : 'Start voice chat'}
            >
              <i className="fa-solid fa-headphones"></i>
              <span>{voiceMode ? 'Voice on' : 'Voice'}</span>
            </button>
          )}

          <div
            className="userIconDiv"
            ref={userIconRef}
            onClick={handleProfileClick}
            role="button"
            tabIndex={0}
            aria-label="Account menu"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleProfileClick();
              }
            }}
          >
            <div className="userIcon">
              {user?.name ? (
                user.name.trim().charAt(0).toUpperCase()
              ) : (
                <i className="fa-solid fa-user"></i>
              )}
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="dropDown" ref={dropDownRef}>
          {user && (
            <div className="dropDownUser">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          )}

          {(isRecognitionSupported || isSynthesisSupported) && (
            <label className="dropDownRow">
              <span>
                <i className="fa-solid fa-language"></i> Voice language
              </span>
              <select value={voiceLang} onChange={handleVoiceLangChange}>
                {VOICE_LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="dropDownItem">
            <i className="fa-solid fa-gear"></i> Settings
          </div>
          <div className="dropDownItem">
            <i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan
          </div>
          <div
            className="dropDownItem"
            role="button"
            tabIndex={0}
            onClick={handleLogout}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleLogout();
              }
            }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i> Log out
          </div>
        </div>
      )}

      <Chat />

      {/* The spinner shows only until the first words arrive */}
      <div className="loadingIndicator">
        <ScaleLoader color="#fff" loading={loading && !streaming} />
      </div>

      {error && (
        <div className="errorBar" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {canRegenerate && (
        <div className="chatActions">
          {truncated && (
            <button type="button" onClick={handleContinue}>
              <i className="fa-solid fa-forward"></i> Continue generating
            </button>
          )}

          <button type="button" onClick={handleRegenerate}>
            <i className="fa-solid fa-rotate-right"></i> Regenerate
          </button>
        </div>
      )}
                     <ResumeBar />
               <InterviewBar />
      <ModeSelector />

      {attachments.length > 0 && (
        <div className="attachmentRow">
          {attachments.map((item) => (
            <div
              key={item.tempId}
              className={`attachChip ${item.status}`}
              title={item.status === 'error' ? item.error : item.name}
            >
              {item.kind === 'image' && item.previewUrl ? (
                <img src={item.previewUrl} alt="" />
              ) : (
                <span className="attachIcon">
                  <i className={fileIconClass(item.name)}></i>
                </span>
              )}

              <span className="attachMeta">
                <span className="attachName">{item.name}</span>
                <span className="attachSub">
                  {item.status === 'uploading'
                    ? 'Uploading...'
                    : item.status === 'error'
                      ? item.error
                      : formatSize(item.size)}
                </span>
              </span>

              <button
                type="button"
                className="attachRemove"
                onClick={() => removeAttachment(item.tempId)}
                aria-label={`Remove ${item.name}`}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      {voiceMode && (
        <div className="voiceBar" role="status" aria-live="polite">
          <span className={`voiceDot ${voiceState}`}></span>
          <span className="voiceLabel">{voiceLabels[voiceState]}</span>
          <span className="voiceLang">{voiceLangLabel}</span>
          <span className="voiceSpacer"></span>

          {voiceState === 'speaking' && (
            <button type="button" onClick={skipSpeaking}>
              Skip
            </button>
          )}

          {voiceState === 'idle' && (
            <button type="button" onClick={handleMicClick}>
              Speak
            </button>
          )}

          <button type="button" onClick={exitVoiceMode}>
            End voice chat
          </button>
        </div>
      )}

      <div className="chatInput">
        <div
          className={isRecognitionSupported ? 'inputBox' : 'inputBox noMic'}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept={ACCEPT}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            className="inputIconBtn attachBtn"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || attachments.length >= MAX_ATTACHMENTS}
            aria-label="Attach images or files"
            title="Attach images or files"
          >
            <i className="fa-solid fa-paperclip"></i>
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder={
              listening
                ? 'Listening...'
                : attachments.length > 0
                  ? 'Add a message (optional)...'
                  : 'Ask anything...'
            }
            value={prompt}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            readOnly={listening}
            disabled={loading}
          />

          {isRecognitionSupported && (
            <button
              type="button"
              className={
                listening
                  ? 'inputIconBtn micBtn active'
                  : 'inputIconBtn micBtn'
              }
              onClick={handleMicClick}
              disabled={loading && !listening}
              aria-label={listening ? 'Stop listening' : 'Speak your message'}
              title={listening ? 'Stop listening' : 'Speak your message'}
            >
              <i
                className={
                  listening
                    ? 'fa-solid fa-microphone-lines'
                    : 'fa-solid fa-microphone'
                }
              ></i>
            </button>
          )}

          {loading ? (
            <button
              id="submit"
              type="button"
              className="stopBtn"
              onClick={stopGeneration}
              aria-label="Stop generating"
              title="Stop generating"
            >
              <i className="fa-solid fa-stop"></i>
            </button>
          ) : (
            <button
              id="submit"
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send message"
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          )}
        </div>
      </div>

      <div className="info">
        SigmaGPT can make mistakes. Check important info.
      </div>
    </div>
  );
}

export default ChatWindow;