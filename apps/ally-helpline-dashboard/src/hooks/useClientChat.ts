import { useState } from "react";
import { api } from "@/services/api";

interface Message {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
  // Add other message properties as needed
}

interface FormattedSession {
  id: string;
  clientId: string;
  counselorId: string;
  status: "paused" | "active" | "completed";
  messages: Message[];
  startedAt: Date;
  endedAt?: Date;
}

// Add interface for API response
interface ChatResponse {
  chatId: number;
  clientId: number;
  counselorId?: number;
  status: "paused" | "active" | "completed";
  messages: Message[];
  startedAt: string;
  endedAt?: string;
}

interface UseClientChatReturn {
  fetchCurrentChat: () => Promise<any>;
  requestChat: () => Promise<any>;
  isLoading: boolean;
  error: Error | null;
  currentSession: FormattedSession | null;
  messages: Message[];
}

export const useClientChat = (): UseClientChatReturn => {
  const [currentSession, setCurrentSession] = useState<FormattedSession | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCurrentChat = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<ChatResponse>("/chats/my-chat");
      const chat = response.data;

      const formattedSession: FormattedSession = {
        id: chat.chatId.toString(),
        clientId: chat.clientId.toString(),
        counselorId: chat.counselorId?.toString() ?? "",
        status: chat.status,
        messages: chat.messages,
        startedAt: new Date(chat.startedAt),
        endedAt: chat.endedAt ? new Date(chat.endedAt) : undefined,
      };

      setCurrentSession(formattedSession);
      setMessages(chat.messages);
      return chat;
    } catch (error) {
      if (error instanceof Error) {
        if ("response" in error && (error as any).response?.status === 404) {
          setCurrentSession(null);
          setMessages([]);
        } else {
          console.error("Error fetching chat:", error);
          setError(error as Error);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const requestChat = async () => {
    try {
      setIsLoading(true);
      const response = await api.post("/chats/request");      
      return response.data;
    } catch (error) {
      console.error("Error requesting chat:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentSession,
    messages,
    isLoading,
    error,
    fetchCurrentChat,
    requestChat,
  };
};
