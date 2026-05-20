import React, { useCallback, useEffect, useState } from 'react';
import { AuthForm } from './auth/AuthForm';
import { fetchChat, fetchChats, fetchCurrentProfile } from './api/client';
import { Sidebar } from './chat/sidebar';
import { ChatWindow } from './chat/ChatWindow';
import { CreateChatModal } from './chat/CreateChatModal';
import { ProfileSettingsModal } from './chat/ProfileSettingsModal';
import type { ChatDetail, ChatSummary, Profile } from './chat/types';
import './chat/chat.css';

const ACCESS_TOKEN_KEY = 'textmessenger_access_token';

const App: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatDetail | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createChatOpen, setCreateChatOpen] = useState(false);

  function onAuthed(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    setAccessToken(token);
  }

  function logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setAccessToken(null);
    setProfile(null);
    setProfileError(null);
    setChats([]);
    setSelectedChatId(null);
    setActiveChat(null);
  }

  const refreshChats = useCallback(async (token: string) => {
    const list = await fetchChats(token);
    setChats(list);
    return list;
  }, []);

  const refreshActiveChat = useCallback(async (token: string, chatId: string) => {
    const detail = await fetchChat(token, chatId);
    setActiveChat(detail);
    return detail;
  }, []);

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

  useEffect(() => {
    if (!accessToken || !profile) return;

    let cancelled = false;
    setChatsLoading(true);
    setChatsError(null);

    refreshChats(accessToken)
      .then((list) => {
        if (cancelled) return;
        if (list.length > 0 && !selectedChatId) {
          setSelectedChatId(list[0].id);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setChatsError(err instanceof Error ? err.message : 'Failed to load chats');
        }
      })
      .finally(() => {
        if (!cancelled) setChatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, profile, refreshChats]);

  useEffect(() => {
    if (!accessToken || !selectedChatId) {
      setActiveChat(null);
      return;
    }

    let cancelled = false;
    setChatLoading(true);
    setChatError(null);

    refreshActiveChat(accessToken, selectedChatId)
      .catch((err: unknown) => {
        if (!cancelled) {
          setChatError(err instanceof Error ? err.message : 'Failed to load chat');
          setActiveChat(null);
        }
      })
      .finally(() => {
        if (!cancelled) setChatLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, selectedChatId, refreshActiveChat]);

  async function handleMessageSent() {
    if (!accessToken || !selectedChatId) return;
    try {
      await Promise.all([
        refreshChats(accessToken),
        refreshActiveChat(accessToken, selectedChatId),
      ]);
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'Failed to refresh chat');
    }
  }

  async function handleChatCreated(detail: ChatDetail) {
    if (!accessToken) return;
    setSelectedChatId(detail.id);
    setActiveChat(detail);
    try {
      await refreshChats(accessToken);
    } catch (err: unknown) {
      setChatsError(err instanceof Error ? err.message : 'Failed to refresh chats');
    }
  }

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

  const activeSummary = chats.find((c) => c.id === selectedChatId);
  const chatName = activeChat?.name ?? activeSummary?.name ?? '';

  return (
    <div className="app-shell">
      <div className="app-shell__inner">
        <Sidebar
          chats={chats}
          chatsLoading={chatsLoading}
          chatsError={chatsError}
          activeChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
          profile={profile}
          onLogout={logout}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenAddChat={() => setCreateChatOpen(true)}
        />
        <ChatWindow
          chatId={selectedChatId}
          name={chatName}
          messages={activeChat?.messages ?? []}
          loading={chatLoading}
          error={chatError}
          currentProfile={profile}
          accessToken={accessToken}
          onMessageSent={handleMessageSent}
        />
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
        <CreateChatModal
          open={createChatOpen}
          accessToken={accessToken}
          onClose={() => setCreateChatOpen(false)}
          onCreated={handleChatCreated}
        />
      </div>
    </div>
  );
};

export default App;
