import { FC } from "react";
import { motion } from "framer-motion";

import { ArticleGrid, Button } from "@/components";
import { articles } from "@/data";
import { ArticleGridStepProps } from "../types";

const ArticleGridStep: FC<ArticleGridStepProps> = ({ onArticleClick, onProceed }) => {
  const handleArticleClick = (articleId: string) => {
    onArticleClick(articles.find(article => article.id === articleId));
  };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <span className="text-base font-medium text-[#47464F]">You might also like</span>
      <ArticleGrid articles={articles} onArticleClick={handleArticleClick} />
      <Button onClick={onProceed} className="rounded-full w-fit self-end">
        Go to dashboard
      </Button>
    </motion.div>
  );
};

export default ArticleGridStep;
