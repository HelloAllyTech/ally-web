import { FC, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { ArticleGrid, Dropdown, ArticleReader } from "@/components";
import { BackCircle } from "@/assets/icons";
import { articles } from "../../data";

const categories = [
  "All Articles",
  "Mental Health",
  "Anxiety",
  "Mindfulness",
  "Work-Life Balance",
  "Sleep",
  "Relationships",
];

const Learn: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("All Articles");

  const selectedArticleId = searchParams.get("articleId");

  const selectedArticle = useMemo(
    () => articles.find(article => article.id === selectedArticleId),
    [selectedArticleId],
  );

  const handleArticleClick = (articleId: string) => {
    setSearchParams({ articleId });
  };

  const handleBackToList = () => {
    setSearchParams({});
  };

  if (selectedArticle) {
    return (
      <div className="h-full p-6 flex flex-col">
        <BackCircle className="self-start cursor-pointer" onClick={handleBackToList} />
        <div className="flex-1 overflow-auto max-h-[80vh]">
          <ArticleReader article={selectedArticle} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="font-medium text-[#47464F]">Learn & Grow</h1>
        <Dropdown value={selectedCategory} options={categories} onChange={setSelectedCategory} />
      </div>
      {articles.length > 0 ? (
        <ArticleGrid articles={articles} onArticleClick={handleArticleClick} />
      ) : (
        <div className="text-center text-gray-500 py-8">
          No articles found matching your search criteria
        </div>
      )}
    </div>
  );
};

export default Learn;
