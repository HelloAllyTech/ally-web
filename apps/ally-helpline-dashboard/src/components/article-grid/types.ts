export interface Article {
  id: string;
  title: string;
  imageUrl: string;
}

export interface ArticleCardProps {
  title: string;
  imageUrl: string;
  onClick?: () => void;
}

export interface ArticleGridProps {
  articles: Article[];
  onArticleClick?: (articleId: string) => void;
} 