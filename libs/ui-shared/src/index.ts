import { FEATURE_FLAGS_MAP } from "./featureFlag";
import { AutoExpandableTextarea } from "./lib/auto-expandable-textarea";
import Badge from "./lib/badge";
import ButtonGroup from "./lib/button-group";
import { ChipGroup } from "./lib/chip-group";
import { CustomImage } from "./lib/custom-image";
import { CustomVideo } from "./lib/custom-video";
import { Dropdown, DropdownField } from "./lib/dropdown-field";
import GenericTable from "./lib/generic-table";
import { GoogleSignInButton } from "./lib/google-sign-in-button";
import { ImageUpload } from "./lib/image-upload";
import InfiniteScroll from "./lib/infinite-scroll";
import { MaxActiveUsersDialog } from "./lib/max-active-users-dialog";
import Pagination from "./lib/pagination";
import { ProgressVideoPlayer } from "./lib/progress-video";
import ResourceCard from "./lib/resource-card";
import ResourceSearch from "./lib/resource-search";
import ResourceSearchBar from "./lib/resource-search-bar";
import { RichTextRenderer, htmlToPlainText } from "./lib/rich-text-renderer";
import SearchHeader from "./lib/search-header";
import {
  SimulationPage,
  SimulationEvents,
  SimulationTimer,
  SimulationScoreMeter,
  getSimulationEvents,
} from "./lib/simulation";
import { SimulationDetailsModal } from "./lib/simulation-details-modal";
import SkeletonLoader from "./lib/skeleton-loader";
import SuggestionsContainer from "./lib/suggestions-container";
import { Tabs } from "./lib/tabs";
import Toggle from "./lib/toggle";
import { logger } from "./logger";

// Central design system: canonical Carbon primitives, the single theme
// boundary, and JS token constants. Apps import these from
// `@ally-ui-mono/ui-shared` and never from `@carbon/react` directly.
export * from "./primitives";
export { AllyThemeProvider } from "./theme";
export type { AllyThemeProviderProps } from "./theme";
export { carbonTokens } from "./tokens";
export type { CarbonTokens } from "./tokens";

export type { Resource, SearchVariant, SimulationDetailsModalProps } from "./types";
export type { ChipItem, ChipGroupProps } from "./lib/chip-group";
export type { GoogleSignInButtonProps } from "./lib/google-sign-in-button";
export type { MaxActiveUsersDialogProps } from "./lib/max-active-users-dialog";
export type { SimulationTranslations, TurnIndicatorTranslations } from "./lib/simulation";
export type { ProgressVideoPlayerProps, ProgressVideoPlayerProgress } from "./lib/progress-video";

export {
  Badge,
  ButtonGroup,
  ChipGroup,
  CustomImage,
  CustomVideo,
  Dropdown,
  DropdownField,
  GenericTable,
  GoogleSignInButton,
  InfiniteScroll,
  MaxActiveUsersDialog,
  Pagination,
  ProgressVideoPlayer,
  ResourceCard,
  ResourceSearch,
  ResourceSearchBar,
  SearchHeader,
  SkeletonLoader,
  SuggestionsContainer,
  logger,
  SimulationPage,
  SimulationEvents,
  SimulationTimer,
  SimulationScoreMeter,
  getSimulationEvents,
  SimulationDetailsModal,
  FEATURE_FLAGS_MAP,
  ImageUpload,
  Toggle,
  AutoExpandableTextarea,
  Tabs,
  RichTextRenderer,
  htmlToPlainText,
};
