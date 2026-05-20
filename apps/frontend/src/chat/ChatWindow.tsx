import React, { useEffect, useState } from 'react';
import { sendMessage } from '../api/client';
import type { Message, Profile } from './types';
import { SendIcon } from './icons';

interface ChatWindowProps {
  chatId: string | null;
  name: string;
  messages: Message[];
  loading?: boolean;
  error?: string | null;
  currentProfile: Profile;
  accessToken: string;
  onMessageSent: () => void | Promise<void>;
  onViewProfile: (username: string) => void;
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
  onViewProfile,
}) => {
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(() => new Set());
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    setLocalMessages([]);
    setUnreadIds(new Set());
    setSendError(null);
  }, [chatId]);

  useEffect(() => {
    if (loading || !chatId) return;

    setLocalMessages((prev) => {
      if (prev.length === 0) return messages;

      const prevIds = new Set(prev.map((m) => m.id));
      const newIds = messages.filter((m) => !prevIds.has(m.id)).map((m) => m.id);
      if (newIds.length > 0) {
        setUnreadIds((u) => {
          const next = new Set(u);
          for (const id of newIds) next.add(id);
          return next;
        });
      }
      return messages;
    });
  }, [chatId, loading, messages]);

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
        ) : localMessages.length === 0 ? (
          <p className="chat-window__status">No messages yet. Say hello!</p>
        ) : (
          localMessages.map(m => {
            const isMine = m.senderId === currentProfile.id;
            const isUnread = unreadIds.has(m.id);
            return (
              <div
                key={m.id}
                className={`message ${isMine ? 'message--mine' : 'message--theirs'}${isUnread ? ' message--unread' : ''}`}
              >
                {!isMine && (
                  <button
                    type="button"
                    className="message__sender"
                    onClick={() => onViewProfile(m.senderUsername)}
                  >
                    {m.sender}
                  </button>
                )}
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
          type="button"
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
