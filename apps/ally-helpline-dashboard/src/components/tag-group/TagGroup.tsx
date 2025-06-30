import React, { useState } from "react";
import { TagDisplay } from "@/pages/calls/types";

interface TagGroupProps {
  tags: TagDisplay[];
  className?: string;
  style?: React.CSSProperties;
}

const TagGroup: React.FC<TagGroupProps> = ({ tags, className = "", style }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`flex gap-1 max-w-full overflow-hidden ${expanded ? "flex-wrap" : "flex-row w-[300px]"} cursor-pointer ${className}`}
      style={style}
      onClick={() => setExpanded(prev => !prev)}
    >
      {tags?.map(tag => (
        <div
          key={tag.label}
          style={{
            backgroundColor: tag?.colors?.bg,
            color: tag?.colors?.text,
          }}
          className="rounded-md px-1.5 py-0.5 text-white text-xs font-medium whitespace-nowrap mb-1"
        >
          {tag.label}
        </div>
      ))}
    </div>
  );
};

export default TagGroup;
