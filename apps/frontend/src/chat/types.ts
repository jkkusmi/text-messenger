export interface Profile {
  id: string;
  account_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
}

export interface ChatSummary {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage: string | null;
  lastMessageAt?: string | null;
}

export interface Message {
  id: string;
  senderId: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface ChatDetail {
  id: string;
  name: string;
  isGroup: boolean;
  messages: Message[];
}
