import { useState, type SubmitEvent } from 'react';
import { API_BASE_URL, assertProductionApiUsesTls } from '../config';
import { sha256HexUtf8 } from './passwordDigest';
import '../chat/chat.css';


type Mode = 'login' | 'register';

async function errorMessageFromResponse(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === 'object' && 'detail' in data && data.detail !== undefined) {
      const d = (data as { detail: unknown }).detail;
      if (typeof d === 'string') return d;
      if (Array.isArray(d))
        return d
          .map((item) =>
            typeof item === 'object' && item && 'msg' in item
              ? String((item as { msg: unknown }).msg)
              : String(item),
          )
          .join(', ');
    }
  } catch {
    /* ignore */
  }
  return res.statusText || `HTTP ${res.status}`;
}

export function AuthForm(props: { onAuthed: (accessToken: string) => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    const prodTls = assertProductionApiUsesTls();
    if (prodTls) { setError(prodTls); return; }
    setPending(true);
    const path = mode === 'login' ? '/auth/login' : '/auth/register';
    let password_digest: string;
    try {
      password_digest = await sha256HexUtf8(password);
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : 'Could not hash password');
      return;
    }
    const body =
      mode === 'login'
        ? { email, password_digest }
        : { email, username, password_digest };
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setError(await errorMessageFromResponse(res)); return; }
      const data = (await res.json()) as { access_token?: string };
      if (!data.access_token) { setError('Missing access_token in response'); return; }
      props.onAuthed(data.access_token);
    } catch {
      setError('Network error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-card__title">Text Messenger</h1>

        <div className="auth-card__tabs">
          <button
            type="button"
            className={`auth-card__tab${mode === 'login' ? ' auth-card__tab--active' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-card__tab${mode === 'register' ? ' auth-card__tab--active' : ''}`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <form className="auth-card__fields" onSubmit={submit}>
          <label className="auth-card__field">
            <span className="auth-card__label">Email</span>
            <input
              type="email"
              className="auth-card__input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          {mode === 'register' && (
            <label className="auth-card__field">
              <span className="auth-card__label">Username</span>
              <input
                className="auth-card__input"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourname"
                required
              />
            </label>
          )}

          <label className="auth-card__field">
            <span className="auth-card__label">Password</span>
            <input
              type="password"
              className="auth-card__input"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <p className="auth-card__error" role="alert">{error}</p>}

          <button type="submit" className="auth-card__submit" disabled={pending}>
            {pending ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
