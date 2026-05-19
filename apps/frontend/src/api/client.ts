import { API_BASE_URL } from '../config';
import type { Profile } from '../chat/types';

export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchCurrentProfile(token: string): Promise<Profile> {
  const res = await fetch(`${API_BASE_URL}/u`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    let detail = res.statusText || `HTTP ${res.status}`;
    try {
      const data: unknown = await res.json();
      if (
        data &&
        typeof data === 'object' &&
        'detail' in data &&
        typeof (data as { detail: unknown }).detail === 'string'
      ) {
        detail = (data as { detail: string }).detail;
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<Profile>;
}
