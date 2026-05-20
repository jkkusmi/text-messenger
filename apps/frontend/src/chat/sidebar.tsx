import React from 'react';
import type { ChatSummary, Profile } from './types';

interface SidebarProps {
  chats: ChatSummary[];
  chatsLoading?: boolean;
  chatsError?: string | null;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onOpenAddChat: () => void;
  profile: Profile;
  onLogout: () => void;
  onOpenSettings: () => void;
}

function avatarColor(name: string): string {
  const palette = ['#1165f7', '#9333ea', '#16a34a', '#dc2626', '#d97706', '#0891b2', '#db2777'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const MuteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <path d="M5 10v2a7 7 0 0 0 12 5" />
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M9 9v3" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

// TODO: revert color to currentColor, make highlight red on hover instead.
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="red" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  chatsLoading,
  chatsError,
  activeChatId,
  onSelectChat,
  onOpenAddChat,
  profile,
  onLogout,
  onOpenSettings,
}) => {
  const displayLabel = profile.display_name ?? profile.username;
  return (
    <div className="sidebar">
      <div className="sidebar__title">Chats</div>

      <div className="sidebar__list">
        <button
          type="button"
          className="sidebar__item sidebar__item--add"
          onClick={onOpenAddChat}
        >
          Add chat
        </button>
        {chatsLoading ? (
          <p className="sidebar__empty">Loading chats…</p>
        ) : chatsError ? (
          <p className="sidebar__empty sidebar__empty--error" role="alert">{chatsError}</p>
        ) : chats.length === 0 ? (
          <p className="sidebar__empty">No chats yet. Add one to get started.</p>
        ) : (
          chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`sidebar__item${activeChatId === chat.id ? ' sidebar__item--active' : ''}`}
            >
              <div className="sidebar__item-avatar" style={{ background: avatarColor(chat.name) }}>
                {initials(chat.name)}
              </div>
              <div className="sidebar__item-info">
                <div className="sidebar__item-name">{chat.name}</div>
                <div className="sidebar__item-preview">
                  {chat.lastMessage ?? 'No messages yet'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__user-avatar">{initials(displayLabel)}</div>
        <span className="sidebar__user-name">{displayLabel}</span>
        <div className="sidebar__footer-actions">
          <button className="icon-btn" title="Mute"><MuteIcon /></button>
          <button type="button" className="icon-btn" title="Settings" onClick={onOpenSettings}>
            <SettingsIcon />
          </button>
          <button type="button" className="icon-btn" title="Sign out" onClick={onLogout}><LogoutIcon /></button>
        </div>
      </div>
    </div>
  );
};
