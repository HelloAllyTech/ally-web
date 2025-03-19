import { FC } from "react";

import { ArticleGrid, Button } from "@/components";
import { Article } from "@/components/article-grid/types";

interface ArticleGridStepProps {
  onProceed: () => void;
}

const articles: Article[] = [
  {
    id: "1",
    title: "Managing Workplace Stress: Practical Tips for Better Mental Health",
    imageUrl: "/images/workplace-stress.jpg",
  },
  {
    id: "2",
    title: "Understanding Anxiety: Signs, Symptoms, and Coping Strategies",
    imageUrl: "/images/anxiety.jpg",
  },
  {
    id: "3",
    title: "The Power of Mindfulness in Daily Life",
    imageUrl: "/images/mindfulness.jpg",
  },
  {
    id: "4",
    title: "Building Healthy Work-Life Boundaries",
    imageUrl: "/images/work-life-balance.jpg",
  },
  {
    id: "5",
    title: "Sleep Better: A Guide to Improving Your Sleep Quality",
    imageUrl: "/images/sleep.jpg",
  },
  {
    id: "6",
    title: "Effective Communication Skills for Better Relationships",
    imageUrl: "/images/communication.jpg",
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
