import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';

const STARTER_PROMPTS = [
  'Why choose ECS over EKS?',
  'How much would this cost?',
  'Can this handle 1 million users?',
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fabRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Move focus into the panel when it opens (so keyboard/screen-reader
  // users land somewhere useful instead of focus staying on the FAB behind
  // a now-open panel), and back to the FAB when it closes, so focus never
  // silently ends up on a removed element.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      fabRef.current?.focus();
    }
  }, [open]);

  // Escape closes the panel, matching how dialogs are conventionally
  // expected to behave for keyboard users.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // If the visitor is on a results page with a recommendation in memory,
  // ground the assistant's answers in that specific stack.
  function getRecommendationContext() {
    if (location.pathname === '/results' && location.state?.recommendation) {
      return { title: location.state.recommendation.title, why: location.state.recommendation.why };
    }
    return undefined;
  }

  async function sendMessage(text) {
    const content = text.trim();
    if (!content || sending) return;

    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError('');

    try {
      const res = await api.post('/assistant/chat', {
        messages: nextMessages,
        recommendationContext: getRecommendationContext(),
      });
      setMessages([...nextMessages, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the assistant. Try again in a moment.');
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel" role="dialog" aria-modal="false" aria-label="AWS assistant chat">
          <div className="chat-panel-head">
            <span>🤖 AWS Assistant</span>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
          </div>

          <div className="chat-messages" ref={scrollRef} role="log" aria-live="polite" aria-label="Conversation">
            {messages.length === 0 && (
              <div className="chat-empty">
                <p>Ask about a service, a tradeoff, or a rough cost estimate.</p>
                <div className="chat-starters">
                  {STARTER_PROMPTS.map((p) => (
                    <button key={p} className="chat-starter" onClick={() => sendMessage(p)}>{p}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>{m.content}</div>
            ))}
            {sending && <div className="chat-bubble assistant chat-thinking" aria-label="Assistant is typing">…</div>}
          </div>

          {error && <p className="form-error chat-error" role="alert">{error}</p>}

          <form className="chat-input-row" onSubmit={handleSubmit}>
            <label htmlFor="chat-input" className="sr-only">Message the AWS assistant</label>
            <input
              id="chat-input"
              ref={inputRef}
              type="text"
              placeholder="Ask something…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()}>send</button>
          </form>
        </div>
      )}

      <button
        ref={fabRef}
        className="chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close AWS assistant chat' : 'Open AWS assistant chat'}
        aria-expanded={open}
      >
        {open ? '✕' : '🤖'}
      </button>
    </div>
  );
}
