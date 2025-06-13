'use client'
import { FC, useState, useRef, useEffect } from 'react';
import Badge from '../badge';

export interface ResourceCardProps {
  title: string;
  description: string;
  category: string;
  tags: string[];
}

const ResourceCard: FC<ResourceCardProps> = ({
  title,
  description,
  category,
  tags,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [description]);

  return (
    <div className="w-full flex flex-col gap-2 border border-[#DADCE1] rounded-[8px] p-4 bg-white">
      <div className="flex justify-between">
        <Badge text={category} variant="ghost" />
        <div className="flex gap-1">
          {tags.map((tag) => (
            <Badge key={tag} text={tag} variant="outlined" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-medium text-[#000]">{title}</span>
        <div className="relative">
          <div
            ref={contentRef}
            style={{ height: isExpanded ? `${contentHeight}px` : '48px' }}
            className={`text-[#525252] overflow-hidden transition-[height] duration-1000 ease-in-out`}
          >
            {description}
          </div>
          {!isExpanded && (
            <div className="absolute bottom-0 right-0 bg-gradient-to-l from-white via-white to-transparent pl-8 pr-1">
              <button
                onClick={() => setIsExpanded(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
              >
                ...more
              </button>
            </div>
          )}
          {isExpanded && (
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
              >
                Show less
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
