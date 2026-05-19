import React, { useState } from 'react';
import type { Chat, Profile } from './types';

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="13 6 19 12 13 18" />
  </svg>
);

export const ChatWindow: React.FC<{ chat: Chat; currentProfile: Profile }> = ({
  chat,
  currentProfile,
}) => {
  const [inputText, setInputText] = useState('');
  const me = currentProfile.display_name ?? currentProfile.username;

  const handleSend = () => {
    if (!inputText.trim()) return;
    // TODO: call POST /m on the backend
    console.log('Sending:', inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="chat-window">
      <div className="chat-window__header">
        <h2>{chat.name}</h2>
      </div>

      <div className="chat-window__messages">
        {chat.messages.map(m => {
          const isMine = m.sender === me;
          return (
            <div key={m.id} className={`message ${isMine ? 'message--mine' : 'message--theirs'}`}>
              {!isMine && <div className="message__sender">{m.sender}</div>}
              <div className="message__bubble">{m.text}</div>
              <div className="message__timestamp">{m.timestamp}</div>
            </div>
          );
        })}
      </div>

      <div className="chat-window__input-area">
        <input
          type="text"
          className="chat-window__input"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
        />
        <button className="icon-btn icon-btn--send" onClick={handleSend} title="Send">
          <SendIcon />
        </button>
      </div>
    </div>
  );
};
