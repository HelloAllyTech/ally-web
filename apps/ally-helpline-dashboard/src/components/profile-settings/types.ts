import { GetProfileUrlRequest, User } from "@types";

export interface profileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  userData: User;
  formMethods?: any;
  onButtonClick: () => void;
  getProfileUrl?: (payload: GetProfileUrlRequest) => Promise<any>;
}
