import { FC, useEffect, useState } from "react";

const SummaryLoading: FC = () => {
  const loadingMessages = [
    "Generating Summary",
    "Understanding context...",
    "Analyzing conversation...",
    "Identifying key points...",
    "Extracting insights...",
  ];

  const [visibleMessages, setVisibleMessages] = useState<string[]>(loadingMessages.slice(0, 2));
  const [currentMessageIndex, setCurrentMessageIndex] = useState(1);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    const showNextMessage = (index: number) => {
      const timer = setTimeout(() => {
        setVisibleMessages(prev => [...prev, loadingMessages[index]]);
        setCurrentMessageIndex(index);
      }, (index - 1) * 2000);
      timers.push(timer);
    };

    for (let i = 2; i < loadingMessages.length; i++) {
      showNextMessage(i);
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] space-y-4">
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">{loadingMessages[0]}</h2>

        <div className="flex flex-col items-start gap-2">
          {visibleMessages.slice(1).map((message, index) => {
            const messageIndex = index + 1;
            const isCurrentMessage = messageIndex === currentMessageIndex;

            return (
              <div
                key={message}
                className={`text-[16px] shimmer-text ${isCurrentMessage ? "active" : "static-text"}`}
                style={{
                  opacity: 1
                }}
              >
                {message}
              </div>
            );
          })}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            @keyframes shimmer {
              0% {
                background-position: 100% 0;
              }
              100% {
                background-position: -100% 0;
              }
            }
            
            .shimmer-text {
              background: linear-gradient(
                90deg,
                #6B7280 0%,
                #9CA3AF 25%,
                #E5E7EB 50%,
                #9CA3AF 75%,
                #6B7280 100%
              );
              background-size: 200% 100%;
              background-clip: text;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: shimmer 2s ease-in-out infinite;
              animation-play-state: paused;
            }

            .shimmer-text.active {
              animation-play-state: running;
            }

            .static-text {
              color: #6B7280;
              background: none;
              -webkit-text-fill-color: initial;
              animation: none;
            }
          `,
        }}
      />
    </div>
  );
};

export default SummaryLoading;
