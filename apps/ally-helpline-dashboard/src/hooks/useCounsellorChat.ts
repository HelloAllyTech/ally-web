import { useState } from "react";
import { api } from "@/services/api";
import { ApiMessage } from "@/types/message";
import { User } from "@/types/user";

interface ChatResponse {
  messages: ApiMessage[];
  counselor?: User;
  client?: User;
}

export const useCounsellorChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getCounsellorChat = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<ChatResponse>(
        "/chats/counsellor-chat"
      );
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptChat = async (chatId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post(`/chats/${chatId}/accept`);
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const endSession = async (chatId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post(`/chats/${chatId}/end`);
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getCounsellorChat,
    acceptChat,
    endSession,
    isLoading,
    error,
  };
};
