import { useState } from "react";

import { api } from "@/services/api";
import { Chat } from "@/types/message";

export const useCounsellorChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getCounsellorChat = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<Chat>(
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
    endSession,
    isLoading,
    error,
  };
};
