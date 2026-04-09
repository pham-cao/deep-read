import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ChatPage.css';

const initialMessages = [
  {
    id: 1,
    type: 'bot',
    sender: 'Architect AI',
    text: "Hello! I'm your AI architectural consultant. How can I help you design your next sustainable project today?",
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    greeting: true,
  },
];

export default function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isStreamingRef = useRef(false);

  const scrollToBottom = () => {
    // During streaming use instant scroll so successive frames don't fight
    // an in-progress smooth animation (which causes visible jank).
    messagesEndRef.current?.scrollIntoView({
      behavior: isStreamingRef.current ? 'auto' : 'smooth',
    });
  };

  // Auth check on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:8000/auth/me', {
          credentials: 'include',
        });
        if (!response.ok) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    // Schedule on next frame so multiple state updates in the same tick
    // (typewriter slices) only cause one scroll instead of N.
    const id = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(id);
  }, [messages, isTyping]);

  const handleNewChat = () => {
    setMessages(initialMessages);
    setSessionId(null);
    setInputValue('');
    setIsTyping(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isTyping) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const userMsg = {
      id: Date.now(),
      type: 'user',
      text: trimmed,
      time: timeStr,
    };

    // Build chat history to send to backend (only user/bot turns, in order)
    const history = messages
      .filter((m) => !m.greeting)
      .map((m) => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    inputRef.current?.focus();

    const botId = Date.now() + 1;
    isStreamingRef.current = true;

    // Typewriter buffer: raw tokens are appended here and drained at a steady
    // cadence by a requestAnimationFrame loop, smoothing out bursty chunks.
    const buffer = { pending: '', streamDone: false };
    let rafId = null;

    const ensureBotMessage = (initialText) => {
      setMessages((prev) => {
        const existing = prev.find((m) => m.id === botId);
        if (existing) return prev;
        return [
          ...prev,
          {
            id: botId,
            type: 'bot',
            sender: 'Architect AI',
            text: initialText,
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            streaming: true,
          },
        ];
      });
    };

    const drain = () => {
      if (buffer.pending.length === 0) {
        if (buffer.streamDone) {
          rafId = null;
          isStreamingRef.current = false;
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, streaming: false } : m))
          );
          return;
        }
        rafId = requestAnimationFrame(drain);
        return;
      }

      // Adaptive cadence: drain faster when the buffer is large so we never
      // fall too far behind, but stay slow enough to feel like typing.
      const len = buffer.pending.length;
      const take = Math.max(2, Math.min(len, Math.ceil(len / 8)));
      const slice = buffer.pending.slice(0, take);
      buffer.pending = buffer.pending.slice(take);

      setMessages((prev) => {
        const existing = prev.find((m) => m.id === botId);
        if (!existing) {
          return [
            ...prev,
            {
              id: botId,
              type: 'bot',
              sender: 'Architect AI',
              text: slice,
              time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
              streaming: true,
            },
          ];
        }
        return prev.map((m) => (m.id === botId ? { ...m, text: m.text + slice } : m));
      });

      rafId = requestAnimationFrame(drain);
    };

    const appendToken = (token) => {
      setIsTyping(false);
      ensureBotMessage('');
      buffer.pending += token;
      if (rafId == null) {
        rafId = requestAnimationFrame(drain);
      }
    };

    const finishStreaming = () => {
      buffer.streamDone = true;
      // If nothing was ever buffered (e.g. error before first token), close out.
      if (rafId == null) {
        isStreamingRef.current = false;
        setMessages((prev) =>
          prev.map((m) => (m.id === botId ? { ...m, streaming: false } : m))
        );
      }
    };

    try {
      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history, session_id: sessionId }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Parse Server-Sent Events: events are separated by blank lines, each
      // line starts with "data: " followed by JSON.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIndex;
        while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);

          for (const line of rawEvent.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const dataStr = line.slice(5).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.session_id) {
                setSessionId(data.session_id);
              } else if (data.token) {
                appendToken(data.token);
              } else if (data.error) {
                appendToken(`\n[Error: ${data.error}]`);
              }
              // data.done → stream finished
            } catch (err) {
              console.error('Bad SSE chunk', dataStr, err);
            }
          }
        }
      }
    } catch (err) {
      appendToken(`\n[Error: ${err.message}]`);
    } finally {
      setIsTyping(false);
      finishStreaming();
    }
  };

  return (
    <div className="chat-page" id="chat-page">
      {/* Chat Header */}
      <header className="chat-header glass">
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            <span className="material-icons-outlined">smart_toy</span>
            <span className="chat-header-status-dot" />
          </div>
          <div>
            <h2 className="chat-header-name title-md">Architect AI</h2>
            <span className="chat-header-status body-sm">Online</span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="chat-header-btn" onClick={handleNewChat} aria-label="New chat">
            <span className="material-icons-outlined">add_comment</span>
          </button>
          <button className="chat-header-btn" id="chat-search-btn" aria-label="Search">
            <span className="material-icons-outlined">search</span>
          </button>
          <button className="chat-header-btn" id="chat-settings-btn" aria-label="Settings">
            <span className="material-icons-outlined">tune</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="chat-messages" id="chat-messages">
        {/* Welcome */}
        <div className="chat-welcome animate-fade-in-up">
          <h1 className="headline-sm">Build with Precision.</h1>
        </div>

        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`chat-msg chat-msg-${msg.type} animate-fade-in`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {msg.type === 'bot' && (
              <div className="chat-msg-avatar">
                <span className="material-icons-outlined">smart_toy</span>
              </div>
            )}
            <div className="chat-msg-content">
              <div className={`chat-msg-bubble chat-msg-bubble-${msg.type}`}>
                {msg.type === 'bot' ? (
                  <div className="chat-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                    {msg.streaming && <span className="chat-cursor">▍</span>}
                  </div>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.text}
                  </div>
                )}
              </div>
              <span className="chat-msg-meta label-sm">
                {msg.sender && <>{msg.sender} • </>}
                {msg.time}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="chat-msg chat-msg-bot animate-fade-in">
            <div className="chat-msg-avatar">
              <span className="material-icons-outlined">smart_toy</span>
            </div>
            <div className="chat-msg-content">
              <div className="chat-msg-bubble chat-msg-bubble-bot chat-typing">
                <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                <span className="typing-dot" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar" id="chat-input-bar">
        <div className="chat-disclaimer body-sm">
          Architect AI can make mistakes. AI responses may be inaccurate. Verify sources.
        </div>
        <form className="chat-input-form" onSubmit={handleSend}>
          <button type="button" className="chat-input-action" aria-label="Attach file">
            <span className="material-icons-outlined">attach_file</span>
          </button>
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Ask about architecture, materials, or design..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            id="chat-input"
          />
          <button
            type="submit"
            className={`chat-send-btn ${inputValue.trim() ? 'active' : ''}`}
            id="chat-send-btn"
            disabled={!inputValue.trim()}
            aria-label="Send message"
          >
            <span className="material-icons-outlined">send</span>
          </button>
        </form>
        <div className="chat-footer-links">
          <a href="#" className="body-sm">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="body-sm">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}
