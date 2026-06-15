import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import { useAuth } from '../context/AuthContext';
import type { Message } from '../types';
import './Chat.css';

interface ChatProps {
  jobPostId: number;
  otherPartyName: string;
}

const Chat: React.FC<ChatProps> = ({ jobPostId, otherPartyName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get<Message[]>(`/JobPosts/${jobPostId}/messages`);
      setMessages(res.data);
    } catch {
      // silently ignore poll errors
    } finally {
      setLoading(false);
    }
  }, [jobPostId]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 8000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.post<Message>(`/JobPosts/${jobPostId}/messages`, { content });
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch (e) {
      setError(extractApiError(e, 'Eroare la trimiterea mesajului.'));
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="chat-wrap card">
      <div className="chat-header">
        <span>💬 Conversație cu <strong>{otherPartyName}</strong></span>
        <button className="chat-refresh" onClick={fetchMessages} title="Actualizează">↻</button>
      </div>

      <div className="chat-messages">
        {loading ? (
          <div className="chat-empty">Se încarcă...</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">Nicio conversație încă. Trimite primul mesaj!</div>
        ) : (
          messages.map(m => {
            const mine = m.senderId === user?.userId;
            return (
              <div key={m.id} className={`chat-msg ${mine ? 'mine' : 'theirs'}`}>
                <div className="chat-bubble">
                  <p className="chat-text">{m.content}</p>
                  <span className="chat-time">{formatTime(m.sentAt)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="alert alert-error chat-error">{error}</div>}

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          rows={2}
          placeholder="Scrie un mesaj... (Enter = trimite, Shift+Enter = linie nouă)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={sending}
          maxLength={1000}
        />
        <button
          className="btn btn-primary chat-send"
          onClick={send}
          disabled={sending || !text.trim()}
        >
          {sending ? '...' : '→'}
        </button>
      </div>
    </div>
  );
};

export default Chat;
