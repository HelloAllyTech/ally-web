import React from "react";

interface TagProps {
  children?: React.ReactNode;
  className?: string;
  onRemove?: () => void;
}

/**
 * Base Tag component - displays a single tag badge
 */
export const Tag: React.FC<TagProps> = ({ children, className = "", onRemove }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-typography-900 text-xs border border-border-light whitespace-nowrap ${className}`}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          className="ml-1.5 cursor-pointer hover:text-typography-700 transition-colors"
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </span>
  );
};

interface TagListProps {
  tags: string[] | null | undefined;
  emptyText?: string;
  className?: string;
  tagClassName?: string | ((tag: string) => string);
}

/**
 * TagList component - displays a read-only list of tags
 */
export const TagList: React.FC<TagListProps> = ({
  tags,
  emptyText = "-",
  className = "",
  tagClassName = "",
}) => {
  const hasValidTags = Array.isArray(tags) && tags.length > 0;

  const getTagClassName = (tag: string): string => {
    if (typeof tagClassName === "function") {
      return tagClassName(tag);
    }
    return tagClassName;
  };

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {hasValidTags ? (
        tags.map((tag: string, index: number) => (
          <Tag key={index} className={getTagClassName(tag)}>
            {tag}
          </Tag>
        ))
      ) : (
        <span className="text-typography-400">{emptyText}</span>
      )}
    </div>
  );
};
