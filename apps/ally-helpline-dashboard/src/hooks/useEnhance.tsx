import { FC, useEffect, useRef, useState } from "react";

import { SkeletonText, logger } from "@ally-ui-mono/ui-shared";
import { useEnhanceContentMutation } from "@api";
import { WandStars } from "@assets";
import { EnhanceButtonProps } from "@types";

export const useEnhance = () => {
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

  /**
   * Triggers content enhancement for a specific field with streaming effect.
   * - Calls the enhance content API with the provided text
   * - Shows loading state during API call
   * - Creates a streaming effect by gradually updating the text
   * - Handles errors gracefully with proper cleanup
   * - Updates the specified field with enhanced content
   * @param {string} key - Unique identifier for the field being enhanced
   * @param {string} inputText - The text content to enhance
   * @param {Function} updateValue - Function to update the field value
   */
  const triggerEnhance = async (
    key: string,
    inputText: string,
    updateValue: (text: string) => void,
  ) => {
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
      logger.info(`Error enhancing content:, ${error}`);
      setEnhancing("");
      setStreaming("");
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    }
  };

  /**
   * React component for the enhance button with loading states.
   * - Displays a wand sparkles icon for enhancement
   * - Shows loading state when enhancement is in progress
   * - Disables interaction during enhancement or streaming
   * - Triggers enhancement when clicked
   * @param {EnhanceButtonProps} props - Component props
   * @param {string} props.fieldName - Unique identifier for the field
   * @param {string} props.inputText - Text content to enhance
   * @param {Function} props.updateValue - Function to update field value
   */
  const EnhanceButton: FC<EnhanceButtonProps> = ({ fieldName, inputText, updateValue }) => (
    <div
      className={
        enhancing === fieldName || streaming === fieldName ? "opacity-50 pointer-events-none" : ""
      }
      onClick={() => triggerEnhance(fieldName, inputText, updateValue)}
    >
      <div className="border-[0.5px] border-[#49454F] active:border-primary-500 hover:border-primary-500 rounded-full p-2 cursor-pointer bg-white group">
        <WandStars
          height={24}
          width={24}
          className="[&_path]:fill-[#49454F] group-hover:[&_path]:fill-[#0957D0]"
        />
      </div>
    </div>
  );

  /**
   * Loading skeleton component for enhancement operations.
   * This component displays three skeleton lines to indicate
   * that content enhancement is in progress.
   */
  const EnhancementLoadingSkeleton = (
    <div className="w-full">
      <SkeletonText paragraph lineCount={3} />
    </div>
  );

  return { enhancing, EnhanceButton, EnhancementLoadingSkeleton, isEnhanceLoading };
};
