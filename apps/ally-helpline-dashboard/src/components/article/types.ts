export interface Article {
  id: string;
  title: string;
  imageUrl: string;
  content: string;
}

export interface ArticleReaderProps {
  article: Article;
  isPage?: boolean;
}

export interface ArticleCardProps {
  title: string;
  imageUrl: string;
  onClick?: () => void;
}

export interface ArticleGridProps {
  articles: Article[];
  onArticleClick?: (id: string) => void;
}
