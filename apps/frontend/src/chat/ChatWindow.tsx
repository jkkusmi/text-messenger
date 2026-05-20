import React, { useState } from 'react';
import { sendMessage } from '../api/client';
import type { Message, Profile } from './types';

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="13 6 19 12 13 18" />
  </svg>
);

interface ChatWindowProps {
  chatId: string | null;
  name: string;
  messages: Message[];
  loading?: boolean;
  error?: string | null;
  currentProfile: Profile;
  accessToken: string;
  onMessageSent: () => void | Promise<void>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  name,
  messages,
  loading,
  error,
  currentProfile,
  accessToken,
  onMessageSent,
}) => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!chatId || !inputText.trim() || sending) return;
    setSendError(null);
    setSending(true);
    try {
      await sendMessage(accessToken, chatId, inputText.trim());
      setInputText('');
      await onMessageSent();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!chatId) {
    return (
      <div className="chat-window chat-window--empty">
        <p>Select a chat or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-window__header">
        <h2>{name || 'Chat'}</h2>
      </div>

      <div className="chat-window__messages">
        {loading ? (
          <p className="chat-window__status">Loading messages…</p>
        ) : error ? (
          <p className="chat-window__status chat-window__status--error" role="alert">{error}</p>
        ) : messages.length === 0 ? (
          <p className="chat-window__status">No messages yet. Say hello!</p>
        ) : (
          messages.map(m => {
            const isMine = m.senderId === currentProfile.id;
            return (
              <div key={m.id} className={`message ${isMine ? 'message--mine' : 'message--theirs'}`}>
                {!isMine && <div className="message__sender">{m.sender}</div>}
                <div className="message__bubble">{m.text}</div>
                <div className="message__timestamp">{m.timestamp}</div>
              </div>
            );
          })
        )}
      </div>

      {sendError ? (
        <p className="chat-window__send-error" role="alert">{sendError}</p>
      ) : null}

      <div className="chat-window__input-area">
        <input
          type="text"
          className="chat-window__input"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={sending || loading}
        />
        <button
          className="icon-btn icon-btn--send"
          onClick={() => void handleSend()}
          title="Send"
          disabled={sending || loading || !inputText.trim()}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
};
