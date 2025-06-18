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

  const renderTags = () => {
    return (
      <div className="flex justify-between">
        <Badge text={category} variant="ghost" className="capitalize" />
        <div className="flex gap-1">
          {tags.map((tag) => (
            <Badge key={tag} text={tag} variant="outlined" />
          ))}
        </div>
      </div>
    );
  };

  const renderShowMoreLess = () => {
    if(isExpanded) {
      return (
        <div className="flex justify-end">
          <span className="underline text-sm cursor-pointer text-[#525252]">
            Show less
          </span>
        </div>
      );
    } else {
      return (
        <div className="absolute bottom-0 right-0 bg-gradient-to-l from-white via-white to-transparent pl-8 pr-1">
          <span className="underline text-sm cursor-pointer text-[#525252]">
            ...more
          </span>
        </div>
      );
    }
  }
      

  return (
    <div
      className="w-full flex flex-col gap-2 border border-[#DADCE1] rounded-[8px] p-4 bg-white cursor-pointer"
      onClick={(e) => { e.stopPropagation(); setIsExpanded((prev) => !prev)}}
    >
      {renderTags()}
      <div className="flex flex-col gap-1">
        <span className="font-medium text-[#000]">{title}</span>
        <div className="relative font-['IBM_Plex_Serif']">
          <div
            ref={contentRef}
            style={{ height: isExpanded ? `${contentHeight}px` : '48px' }}
            className={`text-[#525252] overflow-hidden duration-1000 ease-in-out`}
          >
            {description}
          </div>
          {renderShowMoreLess()}
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
