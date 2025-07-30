export interface StressBusterProps {
  onClose?: () => void;
  playOnMount?: boolean;
  isFullScreenMode?: boolean;
  closeIcon?: React.ReactNode;
  showViewSummaryButton?: boolean;
  onViewSummary?: () => void;
}
