export interface BoxBreathingProps {
  closeIcon?: React.ReactNode;
  isFullScreenMode?: boolean;
  onClose?: () => void;
  onViewSummary?: () => void;
  playOnMount?: boolean;
  showViewSummaryButton?: boolean;
}
