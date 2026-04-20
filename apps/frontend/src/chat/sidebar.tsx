import React from 'react';
import type { Chat } from './types';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string;
  onSelectChat: (chat: Chat) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ chats, activeChatId, onSelectChat }) => {
  return (
    <div style={{ 
      width: '25%', display: 'flex', flexDirection: 'column',
      borderRadius: '16px', overflow: 'hidden',
      background: '#1f1f1f', border: '1px solid #3b3b3b'
    }}>
      <div style={{ padding: '20px', fontSize: '1.5rem', fontWeight: 'bold' }}>Chats</div>
      
      {/* Dynamic Chat List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {chats.map(chat => (
          <div 
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            style={{
              padding: '15px 20px',
              cursor: 'pointer',
              backgroundColor: activeChatId === chat.id ? '#3b3b3b' : 'transparent',
              borderBottom: '1px solid #3b3b3b'
            }}
          >
            <strong>{chat.name}</strong>
            <div style={{ fontSize: '0.8rem', color: '#9e9e9e' }}>{chat.lastMessage}</div>
          </div>
        ))}
      </div>

      {/* Settings Box */}
      <div style={{ padding: '20px', borderTop: '1px solid #3b3b3b', background: '#1f1f1f' }}>
        <button onClick={() => alert('Muted!')}>Mute 🔕</button>
        <button style={{ marginLeft: '10px' }}>Settings ⚙️</button>
      </div>
    </div>
  );
};