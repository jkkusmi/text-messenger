import { API_BASE_URL } from '../config';
import type { ChatDetail, ChatSummary, Message, Profile } from '../chat/types';

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

type ApiMessage = {
  id: string;
  sender_id: string;
  sender_label: string;
  content: string;
  created_at: string;
};

type ApiChatListItem = {
  id: string;
  is_group: boolean;
  name: string;
  last_message: string | null;
  last_message_at: string | null;
};

type ApiChatDetail = {
  id: string;
  is_group: boolean;
  name: string;
  messages: ApiMessage[];
};

function mapMessage(m: ApiMessage): Message {
  return {
    id: m.id,
    senderId: m.sender_id,
    sender: m.sender_label,
    text: m.content,
    timestamp: formatMessageTime(m.created_at),
  };
}

function mapChatSummary(c: ApiChatListItem): ChatSummary {
  return {
    id: c.id,
    name: c.name,
    isGroup: c.is_group,
    lastMessage: c.last_message,
    lastMessageAt: c.last_message_at,
  };
}

function mapChatDetail(c: ApiChatDetail): ChatDetail {
  return {
    id: c.id,
    name: c.name,
    isGroup: c.is_group,
    messages: c.messages.map(mapMessage),
  };
}

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

export async function fetchChats(token: string): Promise<ChatSummary[]> {
  const res = await fetch(`${API_BASE_URL}/m`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
  const data = (await res.json()) as ApiChatListItem[];
  return data.map(mapChatSummary);
}

export async function fetchChat(token: string, chatId: string): Promise<ChatDetail> {
  const res = await fetch(`${API_BASE_URL}/m/${chatId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
  return mapChatDetail((await res.json()) as ApiChatDetail);
}

export async function createChat(
  token: string,
  payload: { usernames: string[] },
): Promise<ChatDetail> {
  const res = await fetch(`${API_BASE_URL}/m`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
  return mapChatDetail((await res.json()) as ApiChatDetail);
}

export async function sendMessage(
  token: string,
  chatId: string,
  content: string,
): Promise<Message> {
  const res = await fetch(`${API_BASE_URL}/m/${chatId}/messages`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
  return mapMessage((await res.json()) as ApiMessage);
}