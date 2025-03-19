import { FC } from "react";

import { ArticleGrid, Button } from "@/components";
import { Article } from "@/components/article-grid/types";
import { Article1, Article2, Article3, Article4, Article5 } from "@/assets/images";

interface ArticleGridStepProps {
  onProceed: () => void;
}

const articles: Article[] = [
  {
    id: "1",
    title: "Managing Workplace Stress: Practical Tips for Better Mental Health",
    imageUrl: Article1,
  },
  {
    id: "2",
    title: "Understanding Anxiety: Signs, Symptoms, and Coping Strategies",
    imageUrl: Article2,
  },
  {
    id: "3",
    title: "The Power of Mindfulness in Daily Life",
    imageUrl: Article3,
  },
  {
    id: "4",
    title: "Building Healthy Work-Life Boundaries",
    imageUrl: Article4,
  },
  {
    id: "5",
    title: "Sleep Better: A Guide to Improving Your Sleep Quality",
    imageUrl: Article5,
  },
  {
    id: "6",
    title: "Effective Communication Skills for Better Relationships",
    imageUrl: Article1,
  },
];

const ArticleGridStep: FC<ArticleGridStepProps> = ({ onProceed }) => {
  const handleArticleClick = (articleId: string) => {
    // Handle article click - show modal
    console.log(`Article clicked: ${articleId}`);
  };

  return (
    <>
      <span className="text-base font-medium text-[#47464F]">You might also like</span>
      <ArticleGrid articles={articles} onArticleClick={handleArticleClick} />
      <Button onClick={onProceed} className="rounded-full w-fit self-end">
        Go to dashboard
      </Button>
    </>
  );
};

export default ArticleGridStep;
