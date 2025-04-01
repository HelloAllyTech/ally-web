interface StressBusterProps {
  onClose?: () => void;
  playOnMount?: boolean;
  isFullScreenMode?: boolean;
  closeIcon?: React.ReactNode;
  showHighlightsButton?: boolean;
  onViewHighlights?: () => void;
}

export type { StressBusterProps };
