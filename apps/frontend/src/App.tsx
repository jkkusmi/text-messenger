import React, { useEffect, useState } from 'react';
import { AuthForm } from './auth/AuthForm';
import { fetchCurrentProfile } from './api/client';
import { Sidebar } from './chat/sidebar';
import { ChatWindow } from './chat/ChatWindow';
import { ProfileSettingsModal } from './chat/ProfileSettingsModal';
import type { Chat, Profile } from './chat/types';
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat>(DUMMY_DATA[0]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function onAuthed(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    setAccessToken(token);
  }

  function logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setAccessToken(null);
    setProfile(null);
    setProfileError(null);
  }

  useEffect(() => {
    if (!accessToken) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);

    fetchCurrentProfile(accessToken)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load profile';
        setProfileError(message);
        setProfile(null);
        if (message.toLowerCase().includes('not authenticated') || message.includes('401')) {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (!accessToken) {
    return <AuthForm onAuthed={onAuthed} />;
  }

  if (profileLoading) {
    return <p>Loading profile…</p>;
  }

  if (profileError || !profile) {
    return (
      <div>
        <p role="alert">{profileError ?? 'Profile unavailable'}</p>
        <button type="button" onClick={logout}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-shell__inner">
        <Sidebar
          chats={DUMMY_DATA}
          activeChatId={selectedChat.id}
          onSelectChat={setSelectedChat}
          profile={profile}
          onLogout={logout}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <ChatWindow chat={selectedChat} currentProfile={profile} />
        <ProfileSettingsModal
          open={settingsOpen}
          profile={profile}
          accessToken={accessToken}
          onClose={() => setSettingsOpen(false)}
          onSaved={setProfile}
          onDeleteAccount={() => {
            setSettingsOpen(false);
            logout();
          }}
        />
      </div>
    </div>
  );
};

export default App;
