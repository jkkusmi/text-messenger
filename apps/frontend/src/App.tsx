import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AuthForm } from './auth/AuthForm';
import { fetchChat, fetchChats, fetchCurrentProfile } from './api/client';
import { Sidebar } from './chat/sidebar';
import { ChatWindow } from './chat/ChatWindow';
import { CreateChatModal } from './chat/CreateChatModal';
import { ProfileSettingsModal } from './chat/ProfileSettingsModal';
import type { ChatDetail, ChatSummary, Profile } from './chat/types';
import './chat/chat.css';

const ACCESS_TOKEN_KEY = 'textmessenger_access_token';
const CHATS_POLL_INTERVAL_MS = 4000;

function summarySnapshotKey(lastMessageAt: string | null | undefined): string {
  return lastMessageAt ?? '';
}

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
  const [chatCache, setChatCache] = useState<Record<string, ChatDetail>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatDetail | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createChatOpen, setCreateChatOpen] = useState(false);
  const [sidebarUpdatedIds, setSidebarUpdatedIds] = useState<Set<string>>(() => new Set());

  const summarySnapshotRef = useRef<Record<string, string>>({});
  const selectedChatIdRef = useRef<string | null>(null);
  const chatsPollInFlight = useRef(false);
  selectedChatIdRef.current = selectedChatId;

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
    setChatCache({});
    summarySnapshotRef.current = {};
    setSidebarUpdatedIds(new Set());
    setSelectedChatId(null);
    setActiveChat(null);
  }

  const mergeIntoCache = useCallback((details: ChatDetail[]) => {
    if (details.length === 0) return;
    setChatCache((prev) => {
      const next = { ...prev };
      for (const d of details) next[d.id] = d;
      return next;
    });
  }, []);

  const fetchChatDetails = useCallback(
    async (token: string, chatIds: string[]) => {
      const unique = [...new Set(chatIds)];
      if (unique.length === 0) return [];
      const details = await Promise.all(unique.map((id) => fetchChat(token, id)));
      mergeIntoCache(details);
      return details;
    },
    [mergeIntoCache],
  );

  const syncChatList = useCallback(async (token: string) => {
    const list = await fetchChats(token);
    setChats(list);
    for (const c of list) {
      if (!(c.id in summarySnapshotRef.current)) {
        summarySnapshotRef.current[c.id] = summarySnapshotKey(c.lastMessageAt);
      }
    }
    return list;
  }, []);

  const syncChatsAndMessages = useCallback(
    async (token: string) => {
      const list = await fetchChats(token);
      setChats(list);

      const idsToFetch: string[] = [];
      const summaryUpdatedIds: string[] = [];
      const activeId = selectedChatIdRef.current;
      for (const c of list) {
        const snapshot = summarySnapshotKey(c.lastMessageAt);
        const prevSnapshot = summarySnapshotRef.current[c.id];
        if (prevSnapshot !== snapshot) {
          idsToFetch.push(c.id);
          summarySnapshotRef.current[c.id] = snapshot;
          if (c.id !== activeId) {
            summaryUpdatedIds.push(c.id);
          }
        }
      }

      if (summaryUpdatedIds.length > 0) {
        setSidebarUpdatedIds((prev) => {
          const next = new Set(prev);
          for (const id of summaryUpdatedIds) next.add(id);
          return next;
        });
      }

      if (idsToFetch.length > 0) {
        await fetchChatDetails(token, idsToFetch);
      }

      return list;
    },
    [fetchChatDetails],
  );

  const handleSelectChat = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
    setSidebarUpdatedIds((prev) => {
      if (!prev.has(chatId)) return prev;
      const next = new Set(prev);
      next.delete(chatId);
      return next;
    });
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

    syncChatList(accessToken)
      .then((list) => {
        if (cancelled) return;
        if (list.length > 0 && !selectedChatId) {
          handleSelectChat(list[0].id);
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
  }, [accessToken, profile, syncChatList, handleSelectChat, selectedChatId]);

  useEffect(() => {
    if (!accessToken || !profile || chatsLoading) return;

    const token = accessToken;
    let cancelled = false;

    async function poll() {
      if (chatsPollInFlight.current || cancelled) return;
      chatsPollInFlight.current = true;
      try {
        await syncChatsAndMessages(token);
      } catch {
        /* ignore transient poll errors */
      } finally {
        chatsPollInFlight.current = false;
      }
    }

    void poll();
    const intervalId = window.setInterval(() => void poll(), CHATS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [accessToken, profile, chatsLoading, syncChatsAndMessages]);

  useEffect(() => {
    if (!accessToken || !selectedChatId) {
      setActiveChat(null);
      return;
    }

    const cached = chatCache[selectedChatId];
    if (cached) {
      setActiveChat(cached);
      setChatError(null);
      setChatLoading(false);
      return;
    }

    let cancelled = false;
    setChatLoading(true);
    setChatError(null);

    fetchChat(accessToken, selectedChatId)
      .then((detail) => {
        if (cancelled) return;
        mergeIntoCache([detail]);
        setActiveChat(detail);
      })
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
  }, [accessToken, selectedChatId, chatCache, mergeIntoCache]);

  useEffect(() => {
    if (!selectedChatId) return;
    const cached = chatCache[selectedChatId];
    if (cached) setActiveChat(cached);
  }, [selectedChatId, chatCache]);

  async function handleMessageSent() {
    if (!accessToken || !selectedChatId) return;
    try {
      await syncChatsAndMessages(accessToken);
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'Failed to refresh chat');
    }
  }

  async function handleChatCreated(detail: ChatDetail) {
    if (!accessToken) return;
    handleSelectChat(detail.id);
    setActiveChat(detail);
    mergeIntoCache([detail]);
    try {
      await syncChatsAndMessages(accessToken);
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
          updatedSummaryChatIds={sidebarUpdatedIds}
          onSelectChat={handleSelectChat}
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
