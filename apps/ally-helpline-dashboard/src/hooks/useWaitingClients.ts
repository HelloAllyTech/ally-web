import { useState } from "react";
import { api } from "@/services/api";

export interface ChatInfo {
  chat_id: number;
  room_id: number;
  client_id: number;
  counselor_id: number | null;
  status: string;
  started_at: string;
  ended_at: string | null;
}

interface WaitingClient {
  user_id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  chat: ChatInfo;
  created_at: string;
  updated_at: string | null;
}

interface WaitingListResponse {
  total_waiting: number;
  clients: WaitingClient[];
}

interface QueueStatResponse {
  priority: number;
  entry_id: number;
  client_id: number;
  chat_id: number;
  wait_start_time: string;
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
