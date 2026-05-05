import React, { useState } from 'react';
import { AuthForm } from './auth/AuthForm';
import { Sidebar } from './chat/sidebar';
import { ChatWindow } from './chat/ChatWindow';
import type { Chat } from './chat/types';
import './chat/chat.css';

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
    <div className="app-shell">
      <div className="app-shell__inner">
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
