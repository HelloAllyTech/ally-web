"use client";
import { FC, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Badge from "../badge";

/**
 * ResourceCard component displays a resource with title, description, category, and tags.
 * It supports expandable/collapsible descriptions and tag badges.
 * @component
 * @param {ResourceCardProps} props - Props for ResourceCard
 */
export interface ResourceCardProps {
  title: string;
  description: string;
  category: string;
  tags: string[];
}

const ResourceCard: FC<ResourceCardProps> = ({ title, description, category, tags }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    // Check if content height is greater than 2 lines (assuming line height of 1.5rem)
    if (contentRef.current) {
      const LINE_HEIGHT = 24; // 1.5rem = 24px
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
      setShouldShowButton(height > LINE_HEIGHT * 2);
    }
  }, [description]);

  /**
   * Renders the category and tag badges.
   * @returns {JSX.Element}
   */
  const renderTags = () => {
    return (
      <div
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        className="flex flex-row justify-between gap-2 overflow-x-hidden"
      >
        <Badge
          text={category}
          variant="ghost"
          className={`capitalize flex-shrink-0 ${category?.trim().length > 0 ? "" : "bg-transparent"}`}
        />
        <div className="flex justify-end w-full sm:max-w-[80%] relative">
          <div
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            className="flex gap-1 overflow-x-auto whitespace-nowrap ml-[20px] scrollbar-hide"
          >
            {tags.map(tag => (
              <Badge key={tag} text={tag} variant="outlined" />
            ))}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders the show more/less button for the description.
   * @returns {JSX.Element | null}
   */
  const renderShowMoreLess = () => {
    if (!shouldShowButton) return null;

    if (isExpanded) {
      return (
        <motion.div
          className="flex justify-end mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            className="text-sm text-[#525252] hover:text-[#000] transition-colors"
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
          >
            Show less
          </button>
        </motion.div>
      );
    } else {
      return (
        <motion.div
          className="absolute bottom-0 right-0 bg-gradient-to-l from-white via-white to-transparent pl-8 pr-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            className="text-sm text-[#525252] hover:text-[#000] transition-colors"
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
          >
            more
          </button>
        </motion.div>
      );
    }
  };

  const processDescription = (description: string) => {
    return description.split("\n").map((line, index) => (
      <span key={index}>
        {line}
        {index < description.split("\n").length - 1 && <br />}
      </span>
    ));
  };

  /**
   * Renders the resource description with expand/collapse animation.
   * @returns {JSX.Element}
   */
  const renderDescription = () => {
    return (
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            ref={contentRef}
            className={`text-[15px] sm:text-[16px] text-[#525252] leading-6 ${
              !isExpanded ? "line-clamp-2" : ""
            }`}
            initial={false}
            animate={{
              height: isExpanded ? contentHeight : Math.min(48, contentHeight), // 48px = 2 lines * 24px line height
              opacity: 1,
            }}
            transition={{
              height: { duration: 0.3, ease: "easeOut" },
              opacity: { duration: 0.2 },
            }}
            style={{
              overflow: "hidden",
            }}
          >
            {processDescription(description)}
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>{renderShowMoreLess()}</AnimatePresence>
      </div>
    );
  };

  return (
    <div
      onClick={() => setIsExpanded(prev => !prev)}
      className="w-full flex flex-col gap-2 border border-[#DADCE1] rounded-[8px] p-3 sm:p-4 bg-white"
    >
      {renderTags()}
      <div className="flex flex-col font-['IBM_Plex_Serif'] gap-1">
        <span className="font-[500] text-[15px] sm:text-[16px] text-[#000]">{title}</span>
        {renderDescription()}
      </div>
    </div>
  );
};

export default ResourceCard;
