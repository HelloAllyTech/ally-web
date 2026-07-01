import { UiTheme } from "@theme/themes";
import { GetProfileUrlRequest, User } from "@types";

export interface profileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  userData: User;
  formMethods?: any;
  onButtonClick: () => void;
  getProfileUrl?: (payload: GetProfileUrlRequest) => Promise<any>;
  /** When true, render the UI theme (Appearance) picker. Gated by allowlist. */
  showThemePicker?: boolean;
  /** Currently selected UI theme. */
  selectedTheme?: UiTheme;
  /** Called when the user picks a theme. */
  onSelectTheme?: (theme: UiTheme) => void;
}
