import React, { useEffect, useState } from 'react';
import { fetchProfileByUsername } from '../api/client';
import type { PublicProfile } from './types';

interface UserProfileModalProps {
  open: boolean;
  username: string | null;
  accessToken: string;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  open,
  username,
  accessToken,
  onClose,
}) => {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !username) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setProfile(null);

    fetchProfileByUsername(accessToken, username)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load profile');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, username, accessToken]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !username) return null;

  const displayName = profile?.display_name ?? profile?.username ?? username;

  return (
    <div className="modal" role="presentation">
      <button
        type="button"
        className="modal__backdrop"
        aria-label="Close profile"
        onClick={onClose}
      />
      <div
        className="modal__dialog profile-settings profile-view"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-title"
      >
        <header className="profile-settings__header">
          <h2 id="user-profile-title" className="profile-settings__title">
            Profile
          </h2>
          <button type="button" className="modal__close icon-btn" title="Close" onClick={onClose}>
            <span>×</span>
          </button>
        </header>

        <div className="profile-settings__form profile-view__body">
          {loading ? (
            <p className="profile-view__status">Loading profile…</p>
          ) : error ? (
            <p className="profile-settings__error" role="alert">{error}</p>
          ) : profile ? (
            <>
              <p className="profile-settings__meta">
                <span className="profile-settings__username">@{profile.username}</span>
              </p>

              <div className="profile-settings__field">
                <span className="profile-settings__label">Display name</span>
                <p className="profile-view__value">{displayName}</p>
              </div>

              <div className="profile-settings__field">
                <span className="profile-settings__label">Bio</span>
                {profile.bio ? (
                  <div
                    className="profile-view__bio rich-editor__area"
                    dangerouslySetInnerHTML={{ __html: profile.bio }}
                  />
                ) : (
                  <p className="profile-view__value profile-view__value--muted">No bio yet</p>
                )}
              </div>
            </>
          ) : null}

          <footer className="profile-settings__actions">
            <button
              type="button"
              className="profile-settings__btn profile-settings__btn--primary"
              onClick={onClose}
            >
              Close
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};
