import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatPage.css';

const initialMessages = [
  {
    id: 1,
    type: 'bot',
    sender: 'Architect AI',
    text: "Hello! I'm your AI architectural consultant. How can I help you design your next sustainable project today?",
    time: '10:41 AM',
    greeting: true,
  },
  {
    id: 2,
    type: 'user',
    text: 'Can you explain the structural requirements for a cantilevered glass balcony in high-wind zones?',
    time: '10:42 AM',
  },
  {
    id: 3,
    type: 'bot',
    sender: 'Architect AI',
    text: `For cantilevered glass balconies in high-wind environments, the primary concern is the dynamic pressure and resultant vibration. You must ensure:

• The reinforced concrete slab has a minimum depth of 250mm at the root.
• Laminated safety glass with a minimum thickness of 21.5mm (SentryGlas interlayer).
• Stainless steel base channels must be recessed and mechanically fixed at 150mm intervals.`,
    time: '10:43 AM',
  },
  {
    id: 4,
    type: 'user',
    text: 'What about thermal bridging at the cantilever connection?',
    time: '10:45 AM',
  },
  {
    id: 5,
    type: 'bot',
    sender: 'Architect AI',
    text: 'Thermal bridging is a critical risk factor. Using a thermal break element (like Schöck Isokorb) is mandatory to maintain the insulation envelope. This decouples the balcony slab from the internal floor slab while maintaining structural integrity.',
    time: '10:45 AM',
  },
];

export default function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const userMsg = {
      id: Date.now(),
      type: 'user',
      text: inputValue.trim(),
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      setIsTyping(false);
      const botMsg = {
        id: Date.now() + 1,
        type: 'bot',
        sender: 'Architect AI',
        text: 'Thank you for your question. Based on architectural best practices and current building codes, I would recommend conducting a thorough site analysis first. Let me provide you with detailed specifications and guidelines for your specific use case.',
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 1800);

    inputRef.current?.focus();
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
                {msg.text.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
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
