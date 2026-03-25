export interface MaxActiveUsersDialogProps {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
  translations: {
    title: string;
    description: string;
    retry: string;
    manualRetry: string;
    autoRetry: string;
  };
}
