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
      width: '25%', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' 
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
              backgroundColor: activeChatId === chat.id ? '#f0f0f0' : 'transparent',
              borderBottom: '1px solid #eee'
            }}
          >
            <strong>{chat.name}</strong>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>{chat.lastMessage}</div>
          </div>
        ))}
      </div>

      {/* Settings Box */}
      <div style={{ padding: '20px', borderTop: '1px solid #ddd', background: '#fafafa' }}>
        <button onClick={() => alert('Muted!')}>Mute 🔕</button>
        <button style={{ marginLeft: '10px' }}>Settings ⚙️</button>
      </div>
    </div>
  );
};