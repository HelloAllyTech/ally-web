import { useState } from "react";
import { api } from "@/services/api";

export interface ChatInfo {
  chatId: number;
  roomId: number;
  clientId: number;
  counselorId: number | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
}

export interface WaitingClient {
  userId: number;
  email: string;
  name: string;
  role: string;
  status: string;
  chat: ChatInfo;
  createdAt: string;
  updatedAt: string | null;
}

interface WaitingListResponse {
  totalWaiting: number;
  clients: WaitingClient[];
}

interface QueueStatResponse {
  priority: number;
  entryId: number;
  clientId: number;
  chatId: number;
  waitStartTime: string;
  status: string;
}

export const useWaitingClients = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getWaitingClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<WaitingListResponse>(
        "/users/waiting-list"
      );
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getQueueStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<QueueStatResponse[]>(
        "/queue/stats"
      );
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getWaitingClients,
    getQueueStats,
    isLoading,
    error,
  };
};
