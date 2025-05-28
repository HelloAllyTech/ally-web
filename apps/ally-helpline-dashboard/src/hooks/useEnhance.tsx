import { FC, useEffect, useRef, useState } from "react";
import { Skeleton } from "@mui/material";
import { WandSparkles } from "lucide-react";

import { useEnhanceContentMutation } from "@/api/callSummary";

interface EnhanceButtonProps {
  fieldName: string;
  inputText: string;
  updateValue: (text: string) => void;
}

const useEnhance = () => {
  const [enhancing, setEnhancing] = useState("");
  const [streaming, setStreaming] = useState("");

  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [enhanceContent, { isLoading: isEnhanceLoading }] = useEnhanceContentMutation();

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    };
  }, []);

  const triggerEnhance = async (key: string, inputText: string, updateValue: (text: string) => void) => {
    try {
      setEnhancing(key);
      const response = await enhanceContent({ content: inputText });

      // Simulating API response - replace with actual API call
      const updatedValue = response?.data?.enhanced_content;

      if (!updatedValue) {
        setEnhancing("");
        return;
      }

      let currentIndex = 0;
      // Create streaming effect by updating text gradually
      setStreaming(key);
      setEnhancing("");

      // Clear any existing interval
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }

      streamIntervalRef.current = setInterval(() => {
        if (currentIndex <= updatedValue?.length) {
          updateValue(updatedValue.slice(0, currentIndex));
          currentIndex = currentIndex + 3;
        } else {
          updateValue(updatedValue);
          setStreaming("");
          if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current);
            streamIntervalRef.current = null;
          } 
        }
      }, 50);
    } catch (error) {
      console.error("Error enhancing content:", error);
      setEnhancing("");
      setStreaming("");
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    }
  };

  const EnhanceButton: FC<EnhanceButtonProps> = ({ fieldName, inputText, updateValue }) => (
    <div
      className={`absolute bottom-2 right-2 
        ${enhancing === fieldName || streaming === fieldName ? "opacity-50 pointer-events-none" : ""}`}
      onClick={() => triggerEnhance(fieldName, inputText, updateValue)}
    >
      <div className="bg-[#E5EFFE] rounded-sm p-2 cursor-pointer">
        <WandSparkles
          className="text-[#046BE0]"
          size={20}
        />
      </div>
    </div>
  );

  const EnhancementLoadingSkeleton = (
    <div className="w-full">
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>
  );

  return { enhancing, EnhanceButton, EnhancementLoadingSkeleton, isEnhanceLoading };
};

export default useEnhance;
