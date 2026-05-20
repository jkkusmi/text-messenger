import { API_BASE_URL } from '../config';
import type { Profile } from '../chat/types';

export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function errorMessageFromResponse(res: Response): Promise<string> {
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
  return detail;
}

export async function fetchCurrentProfile(token: string): Promise<Profile> {
  const res = await fetch(`${API_BASE_URL}/u`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
  return res.json() as Promise<Profile>;
}

export type UpdateProfilePayload = {
  display_name: string | null;
  bio: string | null;
};

export async function updateProfile(
  token: string,
  payload: UpdateProfilePayload,
): Promise<Profile> {
  const res = await fetch(`${API_BASE_URL}/u`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
  return res.json() as Promise<Profile>;
}

export async function deleteAccount(token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/u`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
}