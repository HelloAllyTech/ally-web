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
  const [currentMessageIndex, setCurrentMessageIndex] = useState(1); // Start with the first sub-message

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Show subsequent messages with delays
    for (let i = 2; i < loadingMessages.length; i++) {
      const timer = setTimeout(
        () => {
          setVisibleMessages((prev) => [...prev, loadingMessages[i]]);
          setCurrentMessageIndex(i);
        },
        (i - 1) * 2000
      ); // 2000ms delay between each message
      timers.push(timer);
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] space-y-4">
      <div className="flex flex-col items-center gap-3">
        {/* Main title - always visible and prominent */}
        <h2 className="text-2xl font-bold text-[#1A1A1A]">{loadingMessages[0]}</h2>

        {/* Sequential messages */}
        <div className="flex flex-col items-start gap-2">
          {visibleMessages.slice(1).map((message, index) => {
            const messageIndex = index + 1; // Adjust for slice(1)
            const isCurrentMessage = messageIndex === currentMessageIndex;

            return (
              <div
                key={index}
                className={`text-[16px] ${isCurrentMessage ? "shimmer-text" : "text-[#6B7280]"}`}
                style={{
                  animation: "fadeIn 0.5s ease-in-out",
                  animationFillMode: "forwards",
                  opacity: 1, // Ensure all messages remain visible
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
                background-position: -200% 0;
              }
              100% {
                background-position: 200% 0;
              }
            }
            
            .shimmer-text {
              background: linear-gradient(
                90deg,
                #6B7280 0%,
                #046BE0 25%,
                #60A5FA 50%,
                #046BE0 75%,
                #6B7280 100%
              );
              background-size: 200% 100%;
              background-clip: text;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: shimmer 2s ease-in-out infinite;
            }
          `,
        }}
      />
    </div>
  );
};

export default SummaryLoading;
