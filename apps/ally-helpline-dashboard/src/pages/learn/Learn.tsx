import { FC, useState } from "react";

import { ArticleGrid, Dropdown } from "@/components";
import { Article1, Article2, Article3, Article4, Article5 } from "@/assets/images";
import { Article } from "@/components/article-grid/types";

const categories = [
  "All Articles",
  "Mental Health",
  "Anxiety",
  "Mindfulness",
  "Work-Life Balance",
  "Sleep",
  "Relationships"
];

const articles: Article[] = [
  {
    id: "1",
    title: "Managing Workplace Stress: Practical Tips for Better Mental Health",
    imageUrl: Article1
  },
  {
    id: "2",
    title: "Understanding Anxiety: Signs, Symptoms, and Coping Strategies",
    imageUrl: Article2
  },
  {
    id: "3",
    title: "The Power of Mindfulness in Daily Life",
    imageUrl: Article3
  },
  {
    id: "4",
    title: "Building Healthy Work-Life Boundaries",
    imageUrl: Article4
  },
  {
    id: "5",
    title: "Sleep Better: A Guide to Improving Your Sleep Quality",
    imageUrl: Article5
  },
  {
    id: "6",
    title: "Effective Communication Skills for Better Relationships",
    imageUrl: Article1
  }
];

const Learn: FC = () => {
  const [selectedCategory, setSelectedCategory] = useState("All Articles");

  const handleArticleClick = (articleId: string) => {
    // Handle article click - navigate to article page
    console.log(`Article clicked: ${articleId}`);
  };

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="font-medium text-[#47464F]">Learn & Grow</h1>
        <Dropdown
          value={selectedCategory}
          options={categories}
          onChange={setSelectedCategory}
        />
      </div>
      {/* Articles Grid */}
      {articles.length > 0 ? (
        <ArticleGrid
          articles={articles}
          onArticleClick={handleArticleClick}
        />
      ) : (
        <div className="text-center text-gray-500 py-8">
          No articles found matching your search criteria
        </div>
      )}
    </div>
  );
};

export default Learn;
