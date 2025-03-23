import api from './api';

// Types
export interface Chat {
  _id: string;
  participant: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  lastMessage?: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      username: string;
    };
    createdAt: string;
    read: boolean;
  };
  updatedAt: string;
  unreadCount: number;
}

export interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  recipient: string;
  content: string;
  chat: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  totalPages: number;
  totalMessages: number;
  limit: number;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: Pagination;
}

export interface ChatPreview {
  _id: string;
  participant: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  lastMessage?: Message;
  updatedAt: string;
  unreadCount: number;
}

// API calls
export const chatService = {
  // Get all chats for the current user
  getUserChats: async (): Promise<ChatPreview[]> => {
    const response = await api.get('/chats');
    return response.data;
  },
  
  // Get unread message count
  getUnreadMessageCount: async (): Promise<number> => {
    const response = await api.get('/chats/unread');
    return response.data.unreadCount;
  },
  
  // Get or create chat with another user
  getSingleChat: async (userId: string): Promise<{ chatId: string; participant: any }> => {
    const response = await api.get(`/chats/user/${userId}`);
    return response.data;
  },
  
  // Get messages for a specific chat
  getChatMessages: async (chatId: string, page = 1, limit = 20): Promise<MessagesResponse> => {
    const response = await api.get(`/chats/${chatId}/messages`, {
      params: { page, limit }
    });
    return response.data;
  },
  
  // Mark messages as read
  markMessagesAsRead: async (chatId: string): Promise<{ success: boolean; markedAsRead: number }> => {
    const response = await api.post(`/chats/${chatId}/read`);
    return response.data;
  }
}; 