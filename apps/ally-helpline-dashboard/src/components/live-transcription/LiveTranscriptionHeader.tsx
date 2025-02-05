import { Circle } from "lucide-react";
import { cn } from "@/utils/tailwind";

interface LiveTranscriptionHeaderProps {
  name: string;
  status: "online" | "offline";
  rightContent?: React.ReactNode;
}

const LiveTranscriptionHeader = ({
  name,
  status,
  rightContent,
}: LiveTranscriptionHeaderProps) => {
  return (
    <div className="flex items-center justify-between border-b p-4 bg-gray-800">
      <div className="flex items-center gap-2">
        <Circle
          className={cn(
            "h-2 w-2",
            status === "online"
              ? "fill-green-500 text-green-500"
              : "fill-gray-400 text-gray-400"
          )}
        />
        <h2 className="text-white font-bold">Live call with {name}</h2>
      </div>
      {rightContent}
    </div>
  );
};

export default LiveTranscriptionHeader;
