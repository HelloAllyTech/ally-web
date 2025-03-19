import { FC } from "react";

import ArticleCard from "./ArticleCard";
import { ArticleGridProps } from "./types";

const ArticleGrid: FC<ArticleGridProps> = ({ articles, onArticleClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          title={article.title}
          imageUrl={article.imageUrl}
          onClick={() => onArticleClick?.(article.id)}
        />
      ))}
    </div>
  );
};

export default ArticleGrid;
