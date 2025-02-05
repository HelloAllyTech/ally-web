import { useState, useEffect, useRef } from "react";
import { useRecoilValue } from "recoil";
import { useNavigate } from "react-router-dom";

import { userState } from "@/store/atoms/userAtom";
import { cn } from "@/utils/tailwind";
import { CopilotIcon } from "@/assets/icons";
import { ConfirmationBox, Breather, Spinner } from "@/components";
import CustomMarkdown from "./CustomMarkdown";
import { ROUTES } from "@/constants/routes";
interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface CopilotChatProps {
  className?: string;
  stage?: string;
  tips?: string[];
  messages: ChatMessage[];
  onSendMessage?: (message: string) => void;
  summary?: string;
  isEndSessionLoading?: boolean;
  chatId?: number;
  closeLiveCallView?: boolean;
  setCloseLiveCallView?: (value: boolean) => void;
}

const CopilotChat = ({
  className,
  stage,
  messages,
  // onSendMessage,
  summary,
  isEndSessionLoading,
  closeLiveCallView,
  setCloseLiveCallView,
}: CopilotChatProps) => {
  // TODO Chat input commented out for now, to be added back in once BE is ready
  // const [inputValue, setInputValue] = useState("");
  // const [inputHeight, setInputHeight] = useState("82px");
  const user = useRecoilValue(userState);
  const [showBreather, setShowBreather] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isEndSessionLoading]);

  const navigateToHome = () => {
    navigate(ROUTES.HOME);
  };

  const openBreather = () => {
    setShowBreather(true);
  };

  if (showBreather)
    return (
      <div className={cn("flex h-full flex-col", className)}>
        <Breather onComplete={navigateToHome} />
      </div>
    );

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {!closeLiveCallView ? (
        <>
          {!summary && stage && (
            <div className="rounded-lg m-2 bg-green-50 p-4">
              <div className="text-sm text-gray-500">Current stage:</div>
              <div className="font-medium mt-1">{stage}</div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex w-full animate-message-in opacity-0",
                  message.isUser ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={"max-w-[80%] rounded-lg px-4 py-2 text-sm"}
                  style={{
                    background: message.isUser
                      ? "#F2F2F2"
                      : "linear-gradient(134.31deg, #D8C3F9 -105.84%, #EDF7EA -3.5%, #DAE3F8 62.45%)",
                  }}
                >
                  {!message.isUser && (
                    <div className="flex items-center mb-1">
                      <CopilotIcon />
                    </div>
                  )}
                  {!message.isUser ? (
                    (() => {
                      const parts = message.content
                        .split(":")
                        .map((s) => s.trim());
                      const title = parts[0] || "";
                      const description = parts[1] || "";
                      return (
                        <div>
                          <h3 className="font-semibold mb-2">{title}</h3>
                          {description && (
                            <p className="text-sm">{description}</p>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <CustomMarkdown content={message.content} />
                  )}
                  <span className="mt-1 block text-right text-xs text-gray-500 px-2 pb-1">
                    {message.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {isEndSessionLoading ? (
              <div className="flex justify-center items-center h-[200px]">
                <Spinner />
              </div>
            ) : (
              summary && (
                <>
                  <div className="px-[22px] w-[calc(100%-94px)] py-6 rounded-lg bg-[#E4E4E4]">
                    <CustomMarkdown content={summary} />
                  </div>
                  <div
                    onClick={() => setCloseLiveCallView(true)}
                    className="border cursor-pointer px-3 flex text-sm justify-between items-center rounded-lg py-2 hover:border-[#8d8b8b]"
                  >
                    <div>Summary saved.</div>
                    <div className="font-semibold">Next</div>
                  </div>
                </>
              )
            )}

            <div ref={messagesEndRef} />
          </div>
        </>
      ) : (
        <div className="p-4">
          <ConfirmationBox
            onNo={navigateToHome}
            onYes={openBreather}
            text={
              <>
                <div>
                  Good Job, {user?.name}. You made use of counselling skills and
                  counselling techniques. I noticed that you have been in
                  sessions for a while now.
                </div>
                <div className="mt-4">
                  Would you like to take a two-minute breather?
                </div>
              </>
            }
          />
        </div>
      )}
      {/* <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="relative h-fit">
          <textarea
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setInputHeight(`${e.target.scrollHeight}px`);
            }}
            placeholder="How can I help you?"
            className="flex-1 h-auto min-h-[82px] focus:border-[#84A5F0] focus:border-2 max-h-[100px] custom-scrollbar w-full outline-none border rounded-lg pr-9 p-4"
            style={{ height: inputHeight }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e); // Manually submit the form
              }
            }}
            autoComplete="off"
          />
          <button
            type="submit"
            className="absolute right-0 bottom-0 mr-[21px] mb-[20px] pt-3 pl-5"
          >
            <SendIcon />
          </button>
        </div>
      </form> */}
    </div>
  );
};

export default CopilotChat;
