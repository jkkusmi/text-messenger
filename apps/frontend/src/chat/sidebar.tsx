import React from 'react';
import type { ChatSummary, Profile } from './types';
import { LogoutIcon, MuteIcon, PlusIcon, SettingsIcon } from './icons';

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

      <div className="sidebar__actions">
        <button
          type="button"
          className="sidebar__item--add"
          onClick={onOpenAddChat}
        >
          <PlusIcon />
          New chat
        </button>
      </div>

      <div className="sidebar__list">
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
          <button type="button" className="icon-btn" title="Mute"><MuteIcon /></button>
          <button type="button" className="icon-btn icon-btn--settings" title="Settings" onClick={onOpenSettings}>
            <SettingsIcon />
          </button>
          <button type="button" className="icon-btn icon-btn--danger" title="Sign out" onClick={onLogout}>
            <LogoutIcon />
          </button>
        </div>
      </div>
    </div>
  );
};
