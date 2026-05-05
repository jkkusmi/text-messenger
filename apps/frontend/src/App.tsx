import React, { useState } from 'react';
import { AuthForm } from './auth/AuthForm';
import { Sidebar } from './chat/sidebar';
import { ChatWindow } from './chat/ChatWindow';
import type { Chat } from './chat/types';

const ACCESS_TOKEN_KEY = 'textmessenger_access_token';

const DUMMY_DATA: Chat[] = [
  { 
    id: '1', name: 'Rozmowa grupowa', lastMessage: 'Druga wiadomość', 
    messages: [
      { id: 'm1', sender: 'Piotr', text: 'Pierwsza wiadomość', timestamp: '10:00' },
      { id: 'm2', sender: 'Jan', text: 'Druga Wiadomość', timestamp: '10:12' }
    ] 
  },
  { 
    id: '2', name: 'Text Messenger Team', lastMessage: 'Welcome to Text Messenger!', 
    messages: [{ id: 'm1', sender: 'Text Messenger Team', text: 'Welcome to Text Messenger!', timestamp: '09:57' }] 
  },
];

const App: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  const [selectedChat, setSelectedChat] = useState<Chat>(DUMMY_DATA[0]);

  function onAuthed(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    setAccessToken(token);
  }

  function logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setAccessToken(null);
  }

  if (!accessToken) {
    return <AuthForm onAuthed={onAuthed} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ padding: '8px 12px' }}>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </div>
      <div style={{ display: 'flex', flex: 1, gap: '12px', padding: '0 12px 12px', minHeight: 0, background: '#1a1a1a' }}>
        <Sidebar 
          chats={DUMMY_DATA} 
          activeChatId={selectedChat.id} 
          onSelectChat={setSelectedChat} 
        />
        <ChatWindow chat={selectedChat} />
      </div>
    </div>
  );
};

export default App;
