import { User } from "@src/types";

export interface profileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  userData: User;
  formMethods?: any;
  onButtonClick: () => void;
}
