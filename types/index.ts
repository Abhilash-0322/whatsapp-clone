export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: string;
}

export interface Message {
  _id: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  sender: User;
  createdAt: string;
  mediaUrl?: string;
  fileName?: string;
  conversationId?: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  lastMessageAt?: string;
} 