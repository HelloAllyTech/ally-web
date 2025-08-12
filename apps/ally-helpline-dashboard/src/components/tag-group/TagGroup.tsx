import React, { useState } from "react";

import { TagDisplay } from "@pages/calls/types";

interface TagGroupProps {
  tags: TagDisplay[];
  className?: string;
  style?: React.CSSProperties;
}

const TagGroup: React.FC<TagGroupProps> = ({ tags, className = "", style }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const updateExpanded = () => {
    setIsExpanded(prev => {
      if (prev === false) {
        if (tags?.length < 3) {
          return false;
        }
        return true;
      }
      return false;
    });
  };

  return (
    <div
      className={`flex gap-[8px] items-center py-[8px] overflow-x-hidden ${isExpanded ? "flex-wrap" : "flex-row"} cursor-pointer ${className} max-w-full`}
      style={style}
      onClick={updateExpanded}
    >
      {(isExpanded ? tags : tags?.slice(0, 3))?.map(tag => (
        <div
          key={tag.label}
          style={{
            backgroundColor: tag?.colors?.bg,
            color: tag?.colors?.text,
          }}
          className="rounded-[3px] px-[5px] text-white text-[12px] pt-[2px] font-[400] whitespace-nowrap"
        >
          {isExpanded || tag?.label?.length < 16 || tags?.length < 3
            ? tag.label
            : `${tag.label.slice(0, 16)}...`}
        </div>
      ))}
    </div>
  );
};

export default TagGroup;
