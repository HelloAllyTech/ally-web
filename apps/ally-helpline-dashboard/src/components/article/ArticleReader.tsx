import { FC } from "react";

import { CustomMarkdown } from "@/components";
import { ArticleReaderProps } from "./types";

const ArticleReader: FC<ArticleReaderProps> = ({ article, isPage = true }) => {
  const Title = ({ className }: { className?: string }) => (
    <h1 className={className}>{article.title}</h1>
  );

  return (
    <div className="h-full max-w-3xl mx-auto flex flex-col gap-6">
      {isPage && <Title className="text-[36px] text-[#4A4459]" />}
      <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
      {!isPage && <Title className="text-[20px] font-semibold text-[#4A4459]" />}
      <CustomMarkdown
        content={article.content}
        className={`${isPage ? "!text-[20px]" : "!text-[16px]"} leading-[32px] !text-[#4A4459]`}
      />
    </div>
  );
};

export default ArticleReader;
