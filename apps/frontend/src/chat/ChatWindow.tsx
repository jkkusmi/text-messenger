import React, { useState } from 'react';
import type { Chat } from "./types";

// TODO: replace with the authenticated user's name once auth is implemented
const CURRENT_USER = 'Piotr';

export const ChatWindow: React.FC<{ chat: Chat }> = ({ chat }) => {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    // TODO: call POST /m on the backend here
    console.log('Sending:', inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #ddd' }}>
        <h2>{chat.name}</h2>
      </div>

      {/* Message List */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#fff' }}>
        {chat.messages.map(m => {
          const isMine = m.sender === CURRENT_USER;
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
                marginBottom: '15px',
              }}
            >
              {!isMine && (
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>
                  {m.sender}
                </div>
              )}
              <div
                style={{
                  background: isMine ? '#dcf8c6' : '#f1f0f0',
                  padding: '10px 14px',
                  borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  maxWidth: '65%',
                  wordBreak: 'break-word',
                }}
              >
                {m.text}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '4px' }}>
                {m.timestamp}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div style={{ padding: '20px', borderTop: '1px solid #ddd', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button onClick={handleSend} style={{ padding: '10px 20px' }}>Send</button>
      </div>
    </div>
  );
};