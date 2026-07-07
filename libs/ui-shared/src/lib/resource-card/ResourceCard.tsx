"use client";
import { FC, useState, useRef, useEffect } from "react";

import { ChevronDown } from "@carbon/icons-react";
import { motion, AnimatePresence } from "framer-motion";

import { SearchVariant } from "../../types";
import Badge from "../badge";
import { resourceCardStyles } from "./constants";

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
  mode?: SearchVariant;
  isExpanded: boolean;
  setExpandedCard: (value: boolean) => void;
  viewMoreLabel?: string;
  viewLessLabel?: string;
}

const ResourceCard: FC<ResourceCardProps> = ({
  title,
  description,
  category,
  tags,
  mode = SearchVariant.LIGHT,
  isExpanded = false,
  setExpandedCard,
  viewMoreLabel,
  viewLessLabel,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only check height after component is mounted to prevent hydration mismatch
    if (isMounted && contentRef.current) {
      // Check if content height is greater than 2 lines (assuming line height of 1.5rem)
      const LINE_HEIGHT = 24; // 1.5rem = 24px
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
      setShouldShowButton(height > LINE_HEIGHT * 2);
    }
  }, [description, isMounted]);

  /**
   * Renders the category and tag badges.
   * @returns {JSX.Element}
   */
  const renderTags = () => {
    return (
      <div
        data-testid="resource-card-badges"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        className="flex flex-row justify-between gap-2 overflow-x-hidden"
      >
        <Badge
          text={category}
          variant={mode}
          className={`capitalize flex-shrink-0 ${category?.trim().length > 0 ? "" : "bg-transparent"}`}
          data-testid="resource-card-category-badge"
        />
        <div
          className="flex justify-end w-full sm:max-w-[80%] relative"
          data-testid="resource-card-tags-container"
        >
          <div
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            className="flex gap-1 overflow-x-auto whitespace-nowrap ml-[20px] scrollbar-hide"
          >
            {tags.map(tag => (
              <Badge
                key={tag}
                text={tag}
                variant="outlined"
                data-testid={`resource-card-tag-${tag.toLowerCase().replace(/\s+/g, "-")}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const onExpandCard = () => {
    setExpandedCard(!isExpanded);
  };

  /**
   * Renders the show more/less button for the description.
   * @returns {JSX.Element | null}
   */
  const renderShowMoreLess = () => {
    if (!shouldShowButton) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-1"
        >
          <button
            data-testid="resource-card-toggle-button"
            className={`text-sm transition-colors ${resourceCardStyles[mode].showMoreLess}`}
            onClick={e => {
              e.stopPropagation();
              onExpandCard();
            }}
          >
            {isExpanded ? (
              <div className="flex items-center" data-testid="resource-card-view-less">
                {viewLessLabel || "View less"}
                <ChevronDown size={16} className="rotate-180" />
              </div>
            ) : (
              <div className="flex items-center" data-testid="resource-card-view-more">
                {viewMoreLabel || "View more"}
                <ChevronDown size={16} />
              </div>
            )}
          </button>
        </motion.div>
      </AnimatePresence>
    );
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
      <div data-testid="resource-card-description-container">
        <AnimatePresence mode="wait">
          <motion.div
            ref={contentRef}
            data-testid="resource-card-description"
            className={`text-[15px] sm:text-[14px] md:text-[14px] lg:text-[16px] leading-6 ${!isExpanded ? "line-clamp-2" : ""} ${resourceCardStyles[mode].description}`}
            initial={false}
            animate={{
              height:
                isMounted && contentHeight > 0
                  ? isExpanded
                    ? contentHeight
                    : Math.min(48, contentHeight)
                  : undefined, // Don't animate until mounted
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
      </div>
    );
  };

  return (
    <div
      data-testid="resource-card"
      onClick={onExpandCard}
      className={`w-full flex flex-col gap-2 rounded-[8px] p-3 sm:p-4 md:p-3 lg:p-4 min-w-0 ${resourceCardStyles[mode].card}`}
    >
      {renderTags()}
      <div className="flex flex-col font-['IBM_Plex_Serif']" data-testid="resource-card-content">
        <span
          data-testid="resource-card-title"
          className={`font-[500] text-[15px] sm:text-[14px] md:text-[14px] lg:text-[16px] ${resourceCardStyles[mode].title}`}
        >
          {title}
        </span>
        {renderDescription()}
        {renderShowMoreLess()}
      </div>
    </div>
  );
};

export default ResourceCard;
