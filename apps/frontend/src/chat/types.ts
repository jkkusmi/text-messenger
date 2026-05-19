export interface Profile {
  id: string;
  account_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  messages: Message[];
}