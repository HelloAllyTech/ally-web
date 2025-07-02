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
      className={`flex gap-[8px] items-center py-[8px] max-w-full overflow-x-hidden ${expanded ? "flex-wrap" : "flex-row"} cursor-pointer ${className} max-w-[300px]`}
      style={style}
      onClick={() => setExpanded(prev => !prev)}
    >
      {(expanded ? tags : tags?.slice(0, 3))?.map(tag => (
        <div
          key={tag.label}
          style={{
            backgroundColor: tag?.colors?.bg,
            color: tag?.colors?.text,
          }}
          className="rounded-md px-1.5 py-0.5 text-white text-xs font-medium whitespace-nowrap"
        >
          {tag.label}
        </div>
      ))}
    </div>
  );
};

export default TagGroup;
