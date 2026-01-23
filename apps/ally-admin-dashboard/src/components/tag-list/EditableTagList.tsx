import React from "react";

import { Tag } from "./TagList";

interface EditableTagListProps {
  tags: string[] | null | undefined;
  onRemove: (index: number) => void;
  emptyText?: string;
  className?: string;
  tagClassName?: string;
}

/**
 * EditableTagList component - displays a list of tags with remove functionality
 */
export const EditableTagList: React.FC<EditableTagListProps> = ({
  tags,
  onRemove,
  emptyText = "No tags",
  className = "",
  tagClassName = "",
}) => {
  const hasValidTags = Array.isArray(tags) && tags.length > 0;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {hasValidTags ? (
        tags.map((tag: string, index: number) => (
          <Tag key={index} className={tagClassName} onRemove={() => onRemove(index)}>
            {tag}
          </Tag>
        ))
      ) : (
        <span className="text-typography-400 text-sm">{emptyText}</span>
      )}
    </div>
  );
};
