import { toast } from "sonner";
import { motion } from "framer-motion";
import { useRecoilValue } from "recoil";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  useSocket,
  useClientChat,
  useWaitingClients,
  useCounsellorChat,
} from "@/hooks";
import { cn } from "@/utils/tailwind";
import { UserRole } from "@/types/user";
import { dateTimeStamp } from "@/utils/date";
import { userState } from "@/store/atoms/userAtom";
import { Card, CardHeader, CardTitle } from "@/components";
import { QueueStatus } from "@/constants/common";
import { ROUTES } from "@/constants/routes";
import { ChatStatus, SocketEvent } from "@/types/message";

interface QueueStatResponse {
  priority: number;
  entry_id: number;
  client_id: number;
  chat_id: number;
  wait_start_time: string;
  status: string;
}

interface WaitingListResponse {
  total_waiting: number;
  clients: {
    user_id: number;
    email: string;
    name: string;
    role: string;
    status: string;
    chat: {
      chat_id: number;
      room_id: number;
      client_id: number;
      counselor_id: number;
      status: string;
      started_at: string;
      ended_at: string;
    };
    created_at: string;
    updated_at: string;
  }[];
}

const priorityColors = {
  [QueueStatus.WAITING]: "bg-yellow-100 text-yellow-800",
  [QueueStatus.MATCHED]: "bg-green-100 text-green-800",
};

const Home = () => {
  const [waitingClients, setWaitingClients] = useState<WaitingListResponse>();
  const [queueStats, setQueueStats] = useState<QueueStatResponse[]>([]);
  const {
    getWaitingClients,
    isLoading: clientsLoading,
    getQueueStats,
  } = useWaitingClients();
  const {
    fetchCurrentChat,
    requestChat,
    isLoading: chatLoading,
  } = useClientChat();
  const { acceptChat } = useCounsellorChat();
  const navigate = useNavigate();

  const [isWaiting, setIsWaiting] = useState(false);

  const user = useRecoilValue(userState);

  const socketEventCallbacks = useMemo(
    () => ({
      [SocketEvent.CHAT_ACCEPTED]: () => {
        setIsWaiting(false);
        navigate(ROUTES.LIVE_CALL);
      },
    }),
    []
  );
  const socket = useSocket({ userId: user?.user_id, eventCallbacks: socketEventCallbacks });


  useEffect(() => {
    if (user?.role === UserRole.COUNSELOR) {
      const fetchWaitingClients = async () => {
        try {
          const stats = await getQueueStats();
          const data = await getWaitingClients();
          setWaitingClients(data);
          setQueueStats(stats || []);
        } catch (error) {
          console.error("Error fetching waiting clients:", error);
        }
      };

      fetchWaitingClients();
      // Poll for new clients every 30 seconds
      const interval = setInterval(fetchWaitingClients, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (isWaiting) {
      socket.connect();
    }
  }, [isWaiting, socket]);

  useEffect(() => {
    const checkCurrentChat = async () => {
      if (user?.role === UserRole.CLIENT) {
        const data = await fetchCurrentChat();
        if (data?.counselor_id) {
          navigate(ROUTES.LIVE_CALL);
        }
        if (data?.status === ChatStatus.PAUSED) {
          setIsWaiting(true);
        }
      }
    };
    checkCurrentChat();
  }, [user]);

  const handleClientSelect = async (data) => {
    try {
      await acceptChat(data.chat_id);
      navigate(ROUTES.LIVE_CALL);
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ??
          "Something went wrong. Please try again later!"
      );
      console.error("Error accepting chat:", error);
    }
  };

  const handleStartChat = async () => {
    try {
      const chat = await requestChat();
      if (chat?.status === QueueStatus.WAITING) {
        setIsWaiting(true);
      } else {
        navigate(ROUTES.LIVE_CALL);
      }
    } catch (error) {
      if (error?.response?.data?.detail)
        toast.error(`${error.response.data.detail}`);
      else toast.error("Something went wrong. Please try again later!");
      setIsWaiting(false);
    }
  };

  if (user?.role === UserRole.CLIENT) {
    return (
      <div className="flex-1 min-h-screen overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-screen-xl mx-auto p-6 h-[calc(100vh-100px)]"
        >
          <div className="flex-1 h-full flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full text-center space-y-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome to Lifeline
              </h1>
              <p className="text-gray-600">
                {isWaiting ? (
                  <>
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">
                      Finding a counselor for you..
                    </h2>
                    <p className="text-gray-500">
                      Please wait while we find the best counselor for you..
                    </p>
                  </>
                ) : (
                  "Connect with a counselor instantly and start your journey towards better mental health."
                )}
              </p>
              {chatLoading || isWaiting ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <button
                  onClick={handleStartChat}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Chat with a Counselor
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen overflow-auto">
      <div className="max-w-screen-xl mx-auto p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-medium mb-4">Waiting Clients</h2>
            {clientsLoading &&
            (!waitingClients?.clients ||
              waitingClients?.clients.length === 0) ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : waitingClients?.clients.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  No clients waiting at the moment
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {waitingClients?.clients.map((item) => (
                  <Card
                    key={item.chat.chat_id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleClientSelect(item.chat)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        {/* <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            priorityColors[
                              item.status as keyof typeof priorityColors
                            ] || "bg-gray-100 text-gray-800"
                          )}
                        >
                          {item.status}
                        </span> */}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-500">
                          Waiting start time:{" "}
                          {dateTimeStamp(item.chat.started_at)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Chat ID: {item.chat.chat_id}
                        </div>
                        <div className="text-sm text-gray-500">
                          Status: {item.status}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
            {queueStats.length > 0 && (
              <>
                <h2 className="text-xl font-medium mt-5 mb-4">Queue Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {queueStats.map((item) => (
                    <Card
                      key={item.entry_id}
                      // onClick={() => handleClientSelect(item)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-lg">
                            {item.entry_id}
                          </CardTitle>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              priorityColors[
                                item.status as keyof typeof priorityColors
                              ] || "bg-gray-100 text-gray-800"
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-gray-500">
                            Waiting start time:{" "}
                            {dateTimeStamp(item.wait_start_time)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Chat ID: {item.chat_id}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
