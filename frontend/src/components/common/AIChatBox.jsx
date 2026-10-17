import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  Trash2,
  Copy,
  Check,
  Palette,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiChatAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import './AIChatBox.css';

const SESSION_KEY = 'tenderbridge-floating-ai-session';

const getFloatingSessionId = () => {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-box-${Date.now()}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

const QUICK_CHIPS = [
  'How do milestone payments work?',
  'What documents are required for bidding?',
  'Explain tender eligibility criteria',
  'How are delay risks predicted?'
];

const THEME_PRESETS = [
  { id: 'theme-cyber', name: 'Cyber Indigo', color: '#0ea5e9' },
  { id: 'theme-emerald', name: 'Emerald Jade', color: '#10b981' },
  { id: 'theme-violet', name: 'Cosmic Violet', color: '#8b5cf6' }
];

/** Minimal markdown text parser for assistant responses */
const formatAiMessage = (content = '') => {
  const lines = String(content).split('\n');
  return lines.map((line, lineIdx) => {
    if (!line.trim()) return <div key={lineIdx} style={{ height: '6px' }} />;

    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const text = line.trim().slice(2);
      return (
        <li key={lineIdx} style={{ marginLeft: '16px', marginBottom: '3px' }}>
          {renderBold(text)}
        </li>
      );
    }

    return (
      <p key={lineIdx} style={{ margin: '0 0 6px' }}>
        {renderBold(line)}
      </p>
    );
  });
};

const renderBold = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} style={{ color: 'var(--chat-accent-1)' }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
};

export const AIChatBox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('ai-chat-theme') || 'theme-cyber');
  const [showThemePicker, setShowThemePicker] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 Hello! I am your **TenderBridge AI Copilot**.\nAsk me anything about tenders, milestone claims, GST invoices, or contractor eligibility!`
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, isOpen]);

  const changeTheme = (themeId) => {
    setActiveTheme(themeId);
    localStorage.setItem('ai-chat-theme', themeId);
    setShowThemePicker(false);
  };

  const handleSend = async (customText) => {
    const text = (customText ?? input).trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await aiChatAPI.send({
        sessionId: getFloatingSessionId(),
        message: text,
        context: { role: user?.role }
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.aiResponse || 'I have processed your query.'
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Note: ${err.message || 'Unable to connect to AI server. Please verify backend service.'}`
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard?.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat session cleared. How can I assist you with procurement today?'
      }
    ]);
  };

  return (
    <div className={`ai-chat-root ${activeTheme}`}>
      {/* Floating Trigger Button with Pulsing Glow */}
      {!isOpen && (
        <div className="ai-launcher-wrapper">
          <div className="ai-launcher-tooltip">
            <Sparkles size={13} style={{ color: 'var(--chat-accent-1)' }} />
            TenderBridge AI
          </div>
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="ai-launcher-btn"
            title="Open TenderBridge AI Assistant"
          >
            <div className="ai-launcher-pulse" />
            <Bot size={28} />
            <span className="ai-online-dot" />
          </button>
        </div>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className="ai-chat-window"
          style={{ height: isMinimized ? '58px' : '580px' }}
        >
          {/* Top Accent Stripe */}
          <div className="ai-chat-top-stripe" />

          {/* Window Header */}
          <div className="ai-chat-header">
            <div
              className="ai-header-left"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <div className="ai-avatar-badge">
                <Bot size={20} />
              </div>
              <div>
                <div className="ai-header-title">
                  TenderBridge AI
                  <Sparkles size={13} style={{ color: 'var(--chat-accent-1)' }} />
                </div>
                <div className="ai-header-status">
                  <span className="ai-header-status-dot" />
                  LLaMA 3.3 · Online
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="ai-header-actions">
              {/* Theme Palette Switcher */}
              <div style={{ position: 'relative' }}>
                <button
                  className="ai-btn-icon"
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  title="Change Theme Accent"
                >
                  <Palette size={16} />
                </button>

                {showThemePicker && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '36px',
                      right: 0,
                      background: 'var(--chat-window-bg)',
                      border: '1px solid var(--chat-border)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      display: 'flex',
                      gap: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      zIndex: 10
                    }}
                  >
                    {THEME_PRESETS.map((t) => (
                      <button
                        key={t.id}
                        className="ai-theme-dot"
                        style={{ background: t.color }}
                        onClick={() => changeTheme(t.id)}
                        title={t.name}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Clear Messages */}
              <button
                className="ai-btn-icon"
                onClick={handleClear}
                title="Clear Chat History"
              >
                <Trash2 size={15} />
              </button>

              {/* Open Full Screen Portal View */}
              <button
                className="ai-btn-icon"
                onClick={() => navigate('/portal/ai-assistant')}
                title="Open Full AI Workspace"
              >
                <ExternalLink size={15} />
              </button>

              {/* Minimize / Maximize */}
              <button
                className="ai-btn-icon"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>

              {/* Close Widget */}
              <button
                className="ai-btn-icon"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Chat Window Body */}
          {!isMinimized && (
            <>
              {/* Scrollable Messages Container */}
              <div ref={scrollRef} className="ai-messages-container">
                {messages.map((m, idx) => (
                  <div key={idx} className={`ai-message-row ${m.role}`}>
                    <div
                      className={
                        m.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-assistant'
                      }
                    >
                      {m.role === 'user' ? (
                        m.content
                      ) : (
                        formatAiMessage(m.content)
                      )}
                    </div>

                    {m.role === 'assistant' && (
                      <div className="ai-message-footer">
                        <button
                          onClick={() => copyToClipboard(m.content, idx)}
                          className="ai-copy-btn"
                        >
                          {copiedIdx === idx ? (
                            <>
                              <Check size={11} style={{ color: '#10b981' }} /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={11} /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Animated Typing Indicator */}
                {sending && (
                  <div className="ai-typing-indicator">
                    <div className="ai-dot-wave">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span>TenderBridge AI is formulating response...</span>
                  </div>
                )}
              </div>

              {/* Quick Prompt Chips */}
              <div className="ai-chips-carousel">
                {QUICK_CHIPS.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(chip)}
                    disabled={sending}
                    className="ai-prompt-chip"
                  >
                    <Sparkles size={11} style={{ color: 'var(--chat-accent-1)' }} />
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="ai-chat-input-area"
              >
                <div className="ai-input-pill">
                  <input
                    type="text"
                    className="ai-chat-input"
                    placeholder="Ask AI about tenders, eligibility, bids..."
                    value={input}
                    disabled={sending}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="ai-send-btn"
                  title="Send message (Enter)"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIChatBox;
