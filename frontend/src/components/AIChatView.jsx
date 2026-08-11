import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Trash2, Loader2, Sparkles, User } from 'lucide-react';
import { aiChatAPI } from '../utils/api';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { Badge } from './common/Badge';
import { EmptyState } from './common/EmptyState';

const SESSION_KEY = 'tenderbridge-ai-session';

const getSessionId = () => {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Date.now()}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

const QUICK_PROMPTS = [
  'How do I submit a bid?',
  'What documents are required?',
  'How do payments work?',
  'Explain the eligibility criteria',
];

/** Very small markdown-lite renderer for the assistant's replies. */
const renderAiText = (text = '') => {
  const lines = String(text).split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.map((line, idx) => {
    const bolded = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={j} style={{ color: 'var(--text-bright)' }}>{part.slice(2, -2)}</strong>
        : part
    );
    return <p key={idx} style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{bolded}</p>;
  });
};

/**
 * AI Tender Assistant chat backed by the live /api/ai-chat backend.
 */
export const AIChatView = ({ userRole }) => {
  const isContractor = userRole === 'contractor';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [recommending, setRecommending] = useState(false);
  const listRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await aiChatAPI.history(getSessionId());
      const history = (res.messages || [])
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));
      setMessages(history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, recommendations]);

  const handleSend = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setSending(true);
    setError('');
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    try {
      const res = await aiChatAPI.send({ sessionId: getSessionId(), message });
      setMessages(prev => [...prev, { role: 'assistant', content: res.aiResponse }]);
    } catch (err) {
      setError(err.message || 'Failed to send message.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear this chat session?')) return;
    try {
      await aiChatAPI.clearSession(getSessionId());
      setMessages([]);
      setRecommendations(null);
    } catch (err) {
      setError(err.message || 'Failed to clear session.');
    }
  };

  const handleRecommend = async () => {
    setRecommending(true);
    setError('');
    try {
      const res = await aiChatAPI.recommendTenders();
      setRecommendations(res.recommendations || []);
    } catch (err) {
      setError(err.message || 'Failed to get recommendations.');
    } finally {
      setRecommending(false);
    }
  };
return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--app-text-primary)' }}>
            AI Assistant
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', maxWidth: '520px' }}>
            Ask questions about tenders, bidding, documents and payments.{isContractor && ' Get personalized tender recommendations.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isContractor && (
            <Button variant="secondary" icon={<Sparkles size={16} />} loading={recommending} onClick={handleRecommend}>
              Recommend Tenders
            </Button>
          )}
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={handleClear}>
            Clear Chat
          </Button>
        </div>
      </div>

      {error && <div className="notice-banner error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: recommendations ? '2fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
        <Card title="Chat" icon={<Bot size={18} />}>
          <div
            ref={listRef}
            style={{ height: '480px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Loader2 size={24} className="spin" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState
                icon={<Bot size={32} />}
                title="Hello! I'm your AI Tender Assistant"
                description="Ask anything about tenders, eligibility, documents or payments."
              />
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      background: m.role === 'user' ? 'var(--primary)' : 'rgba(253,241,225,0.05)',
                      color: m.role === 'user' ? '#0b1110' : 'var(--text-bright)',
                      border: m.role === 'user' ? 'none' : '1px solid var(--border-light)',
                    }}
                  >
                    {m.role === 'user' ? m.content : renderAiText(m.content)}
                  </div>
                  <span style={{ marginTop: '4px' }}>
                    {m.role === 'user' ? <User size={16} style={{ color: 'var(--primary)' }} /> : <Bot size={16} style={{ color: 'var(--success)' }} />}
                  </span>
                </div>
              ))
            )}
            {sending && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Loader2 size={16} className="spin" /> Thinking...
              </div>
            )}
          </div>
<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            {QUICK_PROMPTS.map(p => (
              <button key={p} className="filter-chip" onClick={() => handleSend(p)} disabled={sending}>
                {p}
              </button>
            ))}
          </div>

          <form
            style={{ display: 'flex', gap: '10px', marginTop: '14px' }}
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <input
              className="form-control"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
            />
            <Button variant="primary" type="submit" icon={<Send size={16} />} loading={sending} disabled={sending}>
              Send
            </Button>
          </form>
        </Card>

        {recommendations && (
          <Card title="Recommended Tenders" icon={<Sparkles size={18} />}>
            {recommendations.length === 0 ? (
              <EmptyState icon={<Sparkles size={28} />} title="No recommendations" description="No published tenders match your profile right now." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recommendations.map((rec) => (
                  <div key={rec.tender.id} style={{ padding: '12px', background: 'rgba(253,241,225,0.03)', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{rec.tender.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {rec.tender.category} · {Number(rec.tender.estimatedBudget).toLocaleString()} · Score {rec.score}
                    </div>
                    <Badge variant="success">{rec.reason}</Badge>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Deadline: {new Date(rec.tender.deadline).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};