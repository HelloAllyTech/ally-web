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
import ResourceCard from "./lib/resource-card";
import ResourceSearch from "./lib/resource-search";
import ResourceSearchBar from "./lib/resource-search-bar";
import SearchHeader from "./lib/search-header";
import {
  SimulationPage,
  SimulationEvents,
  SimulationTimer,
  SimulationScoreMeter,
  getSimulationEvents,
} from "./lib/simulation";
import { SimulationDetailsModal } from "./lib/simulation-details-modal";
import { RichTextRenderer } from "./lib/rich-text-renderer";
import SkeletonLoader from "./lib/skeleton-loader";
import SuggestionsContainer from "./lib/suggestions-container";
import { Tabs } from "./lib/tabs";
import Toggle from "./lib/toggle";
import { logger } from "./logger";

export type { Resource, SearchVariant, SimulationDetailsModalProps } from "./types";
export type { ChipItem, ChipGroupProps } from "./lib/chip-group";
export type { GoogleSignInButtonProps } from "./lib/google-sign-in-button";
export type { MaxActiveUsersDialogProps } from "./lib/max-active-users-dialog";
export type { SimulationTranslations, TurnIndicatorTranslations } from "./lib/simulation";

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
};
