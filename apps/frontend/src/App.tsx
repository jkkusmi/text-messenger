import React, { useState } from 'react';
import { Sidebar } from './chat/sidebar';
import { ChatWindow } from './chat/ChatWindow';
import type { Chat } from './chat/types';

const DUMMY_DATA: Chat[] = [
  { 
    id: '1', name: 'Rozmowa grupowa', lastMessage: 'Druga wiadomość', 
    messages: [
      { id: 'm1', sender: 'Piotr', text: 'Pierwsza wiadomość', timestamp: '10:00' },
      { id: 'm2', sender: 'Jan', text: 'Druga Wiadomośc', timestamp: '10:12' }
    ] 
  },
  { 
    id: '2', name: 'Text Messenger Team', lastMessage: 'Welcome to Text Messenger!', 
    messages: [{ id: 'm1', sender: 'Text Messenger Team', text: 'Welcome to Text Messenger!', timestamp: '09:57' }] 
  },
];

const App: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat>(DUMMY_DATA[0]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', fontFamily: 'sans-serif' }}>
      <Sidebar 
        chats={DUMMY_DATA} 
        activeChatId={selectedChat.id} 
        onSelectChat={setSelectedChat} 
      />
      <ChatWindow chat={selectedChat} />
    </div>
  );
};

export default App;