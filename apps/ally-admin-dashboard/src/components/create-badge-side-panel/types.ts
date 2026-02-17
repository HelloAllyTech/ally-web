import { Badge } from "@components/create-badge-popup/CreateBadgePopup";
import { UserBadge } from "@types";

export interface CreateBadgeSidePanelProps {
  selectedBadgeType: Badge | null;
  selectedBadge?: UserBadge | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export interface FieldProps {
  label: string;
  children: React.ReactNode;
  multiline?: boolean;
  required?: boolean;
}

export interface AchievementParams {
  count: number;
}

export interface BadgeFormData extends Partial<UserBadge> {
  achievementParams?: AchievementParams;
  groupIds?: number[];
}
