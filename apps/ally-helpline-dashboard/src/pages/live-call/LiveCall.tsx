import { useRecoilValue } from "recoil";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";

import {
  Button,
  Confirm,
  PageHeader,
  CopilotChat,
  MessageInput,
  LiveTranscriptionMessage,
} from "@/components";
import { cn } from "@/utils/tailwind";
import { UserRole } from "@/types/user";
import { ROUTES } from "@/constants/routes";
import { CopilotIcon } from "@/assets/icons";
import { userState } from "@/store/atoms/userAtom";
import { MessageType, SocketEvent } from "@/types/message";
import { useSocket, useClientChat, useCounsellorChat } from "@/hooks";
import { dateStamp, formatMessageDate, timeStamp } from "@/utils/date";

import {
  SummaryInfo,
  LiveCallProps,
  CopilotMessage,
  FormattedMessage,
} from "./types";

const LiveCall = ({ handleLogout }: LiveCallProps) => {
  const [messages, setMessages] = useState<FormattedMessage[]>([]);
  const {
    getCounsellorChat,
    endSession,
    isLoading: isEndSessionLoading,
  } = useCounsellorChat();
  const { fetchCurrentChat } = useClientChat();
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [summary, setSummary] = useState("");
  const [stage, setStage] = useState<string>();
  const user = useRecoilValue(userState);
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const copilotRef = useRef<HTMLDivElement>(null);
  const datePopupTimeoutRef = useRef<NodeJS.Timeout>();
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([]);
  const isClient = user?.role === UserRole.CLIENT;
  const isCounsellor = user?.role === UserRole.COUNSELOR;
  const socketEventCallbacks = useMemo(
    () => ({
      [SocketEvent.STAGE]: (data: any) => {
        setStage(data?.payload?.content);
      },
      [SocketEvent.NUDGE]: (data: any) => {
        const message = data.payload;
        console.log("Nudge received:", message);
        if (message.message_type === MessageType.NUDGE) {
          handleCopilotMessage(message.content);
        }
      },
      [SocketEvent.MESSAGE_RECEIVED]: (data: any) => {
        const message = data.payload;
        if (message.message_type === MessageType.TEXT) {
          if (message?.content === "Session ended") {
            setSessionEnded(true);
            socket.disconnect();
            return;
          }
          setMessages((current) => [
            ...current,
            {
              content: message.content,
              isOutgoing: message.sender_id !== user.user_id,
              timestamp: timeStamp(message.created_at),
              message_id: message.message_id,
              sender_id: message.sender_id,
              created_at: message.created_at,
            },
          ]);
        }
      },
    }),
    []
  );
  const socket = useSocket({
    userId: user?.user_id,
    eventCallbacks: socketEventCallbacks,
  });
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [closeLiveCallView, setCloseLiveCallView] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActiveChat = async () => {
      try {
        let data;
        if (user?.role === UserRole.COUNSELOR) {
          data = await getCounsellorChat();
        } else if (user?.role === UserRole.CLIENT) {
          data = await fetchCurrentChat();
        }
        console.log("Active data", data);
        handleMessages(data);
      } catch (error) {
        console.error("Error fetching active chat:", error);
        setActiveChat(null);
      }
    };

    const handleMessages = (data) => {
      if (data?.current_stage) {
        setStage(data?.current_stage);
      }
      if (data?.messages) {
        const formattedMessages = data.messages
          .filter((msg) => msg.message_type === MessageType.TEXT)
          .map((msg) => ({
            content: msg.content,
            isOutgoing: msg.sender_id !== user.user_id,
            timestamp: timeStamp(msg.created_at),
            message_id: msg.message_id,
            sender_id: msg.sender_id,
            created_at: msg.created_at,
          }));
        setMessages(formattedMessages);
        setActiveChat(data);

        if (isCounsellor) {
          const formattedNudgeMessages = data.messages
            .filter((msg) => msg.message_type === MessageType.NUDGE)
            .map((msg) => ({
              content: msg.content,
              message_id: msg.message_id,
              isUser: false,
            }));
          setCopilotMessages(formattedNudgeMessages);
        }

        if (data.chat_id) {
          socket.connect();
        }
      }
    };
    fetchActiveChat();

    return () => {
      socket.disconnect();
    };
  }, [user, isCounsellor, isClient]);

  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop =
        transcriptionRef.current.scrollHeight;
    }
    if (copilotRef.current) {
      copilotRef.current.scrollTop = copilotRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    if (transcriptionRef.current) {
      // const { scrollTop } = transcriptionRef.current;
      const messages = transcriptionRef.current.querySelectorAll("[data-date]");
      let currentVisibleDate = "";

      messages.forEach((message) => {
        const messageTop = message.getBoundingClientRect().top;
        if (
          messageTop > 0 &&
          messageTop < window.innerHeight &&
          message instanceof HTMLElement
        ) {
          currentVisibleDate = message.dataset.date || "";
        }
      });

      if (currentVisibleDate) {
        setCurrentDate(currentVisibleDate);
        setShowDatePopup(true);

        // Clear existing timeout
        if (datePopupTimeoutRef.current) {
          clearTimeout(datePopupTimeoutRef.current);
        }

        // Hide the popup after 1.5 seconds of no scrolling
        datePopupTimeoutRef.current = setTimeout(() => {
          setShowDatePopup(false);
        }, 1500);
      }
    }
  };

  useEffect(() => {
    const transcriptionElement = transcriptionRef.current;
    if (transcriptionElement) {
      transcriptionElement.addEventListener("scroll", handleScroll);
      return () => {
        transcriptionElement.removeEventListener("scroll", handleScroll);
        if (datePopupTimeoutRef.current) {
          clearTimeout(datePopupTimeoutRef.current);
        }
      };
    }
  }, []);

  const handleSendMessage = (content: string) => {
    if (!activeChat?.chat_id) return;
    socket.sendMessage({
      chat_id: activeChat.chat_id,
      content,
      context: {},
    });
  };

  const handleCopilotMessage = (content: string) => {
    const newMessage: CopilotMessage = {
      content,
      isUser: false,
      timestamp: timeStamp(),
    };
    setCopilotMessages((prev) => [...prev, newMessage]);
  };

  const confirmEndSession = async () => {
    try {
      socket.sendMessage({
        chat_id: activeChat.chat_id,
        content: "Session ended",
        context: {},
      });
      const summaryInfo = (await endSession(activeChat.chat_id)) as SummaryInfo;
      setSummary(summaryInfo?.summary);
      socket.disconnect();
      setSessionEnded(true);
    } catch (error) {
      console.error("Error ending session:", error);
    } finally {
      setShowEndDialog(false);
    }
  };

  // if (isChatUnassigned) {
  //   return (
  //     <div className="flex flex-1 items-center justify-center h-screen">
  //       <div className="text-center">
  //         <div className="flex justify-center">
  //           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  //         </div>
  // <h2 className="text-2xl font-semibold text-gray-700 mb-2">
  //   Finding a counselor for you..
  // </h2>
  // <p className="text-gray-500">
  //   Please wait while we find the best counselor for you..
  // </p>
  //       </div>
  //     </div>
  //   );
  // }

  if (
    !sessionEnded &&
    (!activeChat?.chat_id || (isClient && activeChat?.status === "paused"))
  ) {
    return (
      <div className="flex flex-1 items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            No Active Chat
          </h2>
          <p className="text-gray-500">
            There is currently no active chat session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen overflow-auto">
      <PageHeader
        title={`Live call with ${
          isClient ? activeChat?.counselor?.name : activeChat?.client?.name
        }`}
        showSearch={false}
        onLogout={handleLogout}
      />
      <div
        className={cn(
          "flex flex-1 gap-4 mt-4 px-4 pb-4 h-[calc(100vh-88px)] overflow-hidden",
          isClient && " max-w-7xl mx-auto"
        )}
      >
        {(!closeLiveCallView || isClient) && (
          <div
            className={cn(
              "flex flex-col flex-1 rounded-lg overflow-hidden transition-transform duration-300 ease-in-out",
              // isClient ? "w-full" : "w-[65%]",
              closeLiveCallView && !isClient ? "scale-0 opacity-0" : "scale-100"
            )}
          >
            <div className="bg-gray-800 text-white py-[14px] px-[26px] font-medium flex justify-between align-center">
              <span className="my-auto font-normal text-xs">
                Live transcript
              </span>
              {isCounsellor && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-fit py-1 text-xs"
                  onClick={() => setShowEndDialog(true)}
                  disabled={sessionEnded}
                >
                  End Session
                </Button>
              )}
            </div>

            <div className="relative flex-1 flex flex-col">
              {showDatePopup && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-gray-800 text-white px-3 py-1 rounded-full text-sm shadow-lg">
                  {new Date(currentDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
              <div
                ref={transcriptionRef}
                className="absolute inset-0 overflow-y-auto p-4 pl-4 pb-4 bg-white custom-scrollbar"
                style={{ bottom: "115px" }}
              >
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const messageDate = formatMessageDate(message.created_at);
                    const prevMessageDate =
                      index > 0
                        ? formatMessageDate(messages[index - 1].created_at)
                        : null;
                    const showDateDivider =
                      index === 0 || messageDate !== prevMessageDate;

                    return messageDate ? (
                      <div
                        key={`container-${message.message_id}`}
                        data-date={messageDate}
                      >
                        {showDateDivider && (
                          <div className="text-center my-4">
                            <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                              {dateStamp(messageDate)}
                            </span>
                          </div>
                        )}
                        <LiveTranscriptionMessage
                          key={`message-${message.message_id}`}
                          {...message}
                        />
                      </div>
                    ) : (
                      <div key={`container-${message.message_id}`}>
                        <LiveTranscriptionMessage
                          key={`message-${message.message_id}`}
                          {...message}
                        />
                      </div>
                    );
                  })}
                </div>
                {sessionEnded && (
                  <div className="flex items-center flex-col mt-4">
                    <span
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                      )}
                    >
                      This chat has been disconnected!
                    </span>
                    <div
                      onClick={() => navigate(ROUTES.HOME)}
                      className="text-xs cursor-pointer mt-4 text-blue-500 hover:text-blue-400"
                    >
                      Go back to homepage
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-white border-t">
                <MessageInput
                  disabled={sessionEnded}
                  onSend={handleSendMessage}
                />
              </div>
            </div>
          </div>
        )}

        {isCounsellor && (
          <div
            className={cn(
              "flex flex-col rounded-lg overflow-hidden border border-[#84A5F0] transition-all duration-300",
              closeLiveCallView
                ? "w-[788px] mx-auto animate-expand"
                : "min-w-[502px] w-[35%]"
            )}
          >
            <div className="bg-gray-800 text-white py-[13px] px-[26px] font-medium">
              <div className="flex items-center gap-2">
                <CopilotIcon />
                <span>Copilot</span>
              </div>
            </div>
            <div ref={copilotRef} className="flex-1 overflow-y-auto min-h-0">
              <CopilotChat
                className="flex-1 bg-white h-full"
                stage={stage}
                messages={copilotMessages}
                isEndSessionLoading={isEndSessionLoading}
                onSendMessage={handleCopilotMessage}
                summary={sessionEnded && summary ? String(summary) : undefined}
                closeLiveCallView={closeLiveCallView}
                setCloseLiveCallView={(value) => setCloseLiveCallView(value)}
              />
            </div>
          </div>
        )}
      </div>
      <Confirm
        open={showEndDialog}
        onOpenChange={setShowEndDialog}
        text={
          <>
            <p>Are you sure you want to end this session?</p>
            <p className="mt-2">This action cannot be undone.</p>
          </>
        }
        onConfirm={confirmEndSession}
        onCancel={() => setShowEndDialog(false)}
        confirmText="End"
        cancelText="Cancel"
        isLoading={isEndSessionLoading}
      />
    </div>
  );
};

export default LiveCall;
