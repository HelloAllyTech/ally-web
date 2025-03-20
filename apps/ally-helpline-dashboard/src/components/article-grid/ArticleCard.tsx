import { FC } from "react";

import { ArticleCardProps } from "./types";

const ArticleCard: FC<ArticleCardProps> = ({ title, imageUrl, onClick }) => {
  return (
    <div
      className="flex flex-col rounded-[8px] border border-[#E5E7EB] 
        cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      onClick={onClick}
    >
      <img src={imageUrl} alt={title} className="w-full h-full object-cover flex-1" />
      <div className="p-[10px] flex flex-col gap-[10px] flex-1">
        <span className="text-[12px] text-[#929090]">Article</span>
        <h3 className="text-[14px] font-medium text-[#4A4459] line-clamp-2">{title}</h3>
      </div>
    </div>
  );
};

export default ArticleCard;
