import React, { useEffect, useState, type SubmitEvent } from 'react';
import { deleteAccount, updateProfile } from '../api/client';
import type { Profile } from './types';
import { RichTextEditor } from './RichTextEditor';

interface ProfileSettingsModalProps {
  open: boolean;
  profile: Profile;
  accessToken: string;
  onClose: () => void;
  onSaved: (profile: Profile) => void;
  onDeleteAccount: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  open,
  profile,
  accessToken,
  onClose,
  onSaved,
  onDeleteAccount,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDisplayName(profile.display_name ?? '');
    setBio(profile.bio ?? '');
    setError(null);
    setPending(false);
    setDeleteConfirmOpen(false);
    setDeleting(false);
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (deleteConfirmOpen) setDeleteConfirmOpen(false);
        else onClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, deleteConfirmOpen]);

  if (!open) return null;

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const trimmed = displayName.trim();
      const updated = await updateProfile(accessToken, {
        display_name: trimmed.length > 0 ? trimmed : null,
        bio: bio.trim().length > 0 ? bio : null,
      });
      onSaved(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteAccount() {
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount(accessToken);
      onDeleteAccount();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal" role="presentation">
      <button
        type="button"
        className="modal__backdrop"
        aria-label="Close settings"
        onClick={onClose}
      />
      <div
        className="modal__dialog profile-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
      >
        <header className="profile-settings__header">
          <h2 id="profile-settings-title" className="profile-settings__title">
            Profile settings
          </h2>
          <button type="button" className="modal__close icon-btn" title="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <form className="profile-settings__form" onSubmit={submit}>
          <p className="profile-settings__meta">
            Signed in as <span className="profile-settings__username">@{profile.username}</span>
          </p>

          <label className="profile-settings__field">
            <span className="profile-settings__label">Display name</span>
            <input
              type="text"
              className="profile-settings__input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={profile.username}
              maxLength={255}
              autoComplete="nickname"
            />
          </label>

          <div className="profile-settings__field">
            <span className="profile-settings__label">Bio</span>
            <RichTextEditor
              id="profile-bio-editor"
              value={bio}
              onChange={setBio}
              placeholder="Tell others about yourself…"
            />
          </div>

          <hr className="profile-settings__separator" />

          <div className="profile-settings__field profile-settings__danger">
            <span className="profile-settings__label">Delete account</span>
            {deleteConfirmOpen ? (
              <>
                <p className="profile-settings__danger-text">
                  This permanently deletes your account, profile, and all associated data.
                  This cannot be undone.
                </p>
                <div className="profile-settings__danger-actions">
                  <button
                    type="button"
                    className="profile-settings__btn profile-settings__btn--ghost"
                    onClick={() => setDeleteConfirmOpen(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="profile-settings__btn profile-settings__btn--delete"
                    onClick={handleDeleteAccount}
                    disabled={deleting || pending}
                  >
                    {deleting ? 'Deleting…' : 'Confirm delete'}
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="profile-settings__btn profile-settings__btn--delete"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={pending || deleting}
              >
                Delete account
              </button>
            )}
          </div>

          {error ? <p className="profile-settings__error" role="alert">{error}</p> : null}

          <footer className="profile-settings__actions">
            <button type="button" className="profile-settings__btn profile-settings__btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="profile-settings__btn profile-settings__btn--primary"
              disabled={pending || deleting}
            >
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
