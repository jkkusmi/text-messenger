import React, { useEffect, useState, type SubmitEvent } from 'react';
import { createChat } from '../api/client';
import type { ChatDetail } from './types';

interface CreateChatModalProps {
  open: boolean;
  accessToken: string;
  onClose: () => void;
  onCreated: (chat: ChatDetail) => void;
}

function parseUsernames(raw: string): string[] {
  return raw
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  open,
  accessToken,
  onClose,
  onCreated,
}) => {
  const [usernamesText, setUsernamesText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUsernamesText('');
    setError(null);
    setPending(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const usernames = parseUsernames(usernamesText);
    if (usernames.length === 0) {
      setError('Enter at least one username');
      return;
    }

    setError(null);
    setPending(true);
    try {
      const chat = await createChat(accessToken, { usernames });
      onCreated(chat);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create chat');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal" role="presentation">
      <button
        type="button"
        className="modal__backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="modal__dialog profile-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-chat-title"
      >
        <header className="profile-settings__header">
          <h2 id="create-chat-title" className="profile-settings__title">
            New chat
          </h2>
          <button type="button" className="modal__close icon-btn" title="Close" onClick={onClose}>
            <span>×</span>
          </button>
        </header>

        <form className="profile-settings__form" onSubmit={submit}>
          <p className="profile-settings__meta create-chat__hint">
            One username opens a direct message (reuses an existing DM if you already have one).
            Two or more usernames create a group chat.
          </p>

          <label className="profile-settings__field">
            <span className="profile-settings__label">Usernames</span>
            <textarea
              className="profile-settings__input create-chat__input"
              value={usernamesText}
              onChange={(e) => setUsernamesText(e.target.value)}
              placeholder={'alice\nbob, carol'}
              rows={4}
              autoFocus
            />
          </label>

          {error ? <p className="profile-settings__error" role="alert">{error}</p> : null}

          <footer className="profile-settings__actions">
            <button type="button" className="profile-settings__btn profile-settings__btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="profile-settings__btn profile-settings__btn--primary"
              disabled={pending}
            >
              {pending ? 'Creating…' : 'Create chat'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
