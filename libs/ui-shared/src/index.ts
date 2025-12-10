import { FEATURE_FLAGS_MAP } from "./featureFlag";
import Badge from "./lib/badge";
import ButtonGroup from "./lib/button-group";
import { ChipGroup } from "./lib/chip-group";
import { CustomImage } from "./lib/custom-image";
import { CustomVideo } from "./lib/custom-video";
import { Dropdown, DropdownField } from "./lib/dropdown-field";
import GenericTable from "./lib/generic-table";
import InfiniteScroll from "./lib/infinite-scroll";
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
import SkeletonLoader from "./lib/skeleton-loader";
import SuggestionsContainer from "./lib/suggestions-container";
import { logger } from "./logger";

export type { Resource, SearchVariant, SimulationDetailsModalProps } from "./types";
export type { ChipItem, ChipGroupProps } from "./lib/chip-group";

export {
  Badge,
  ButtonGroup,
  ChipGroup,
  CustomImage,
  CustomVideo,
  Dropdown,
  DropdownField,
  GenericTable,
  InfiniteScroll,
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
};
