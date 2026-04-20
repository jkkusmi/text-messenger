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