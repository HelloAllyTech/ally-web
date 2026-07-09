/**
 * Canonical UI primitives for the whole monorepo.
 *
 * This is the ONLY module in the repo that is allowed to import from
 * `@carbon/react` (enforced by the `no-restricted-imports` ESLint rule). Every
 * app and every higher-level component imports primitives from
 * `@ally-ui-mono/ui-shared` instead, so the design system has a single source
 * of truth and MUI is no longer needed anywhere.
 *
 * Most primitives are thin re-exports of the Carbon component. Where the app
 * needs a shared default or a component Carbon core does not ship (SidePanel),
 * a small wrapper lives alongside this file and is re-exported here.
 */

// --- Actions -------------------------------------------------------------
export { Button, IconButton } from "@carbon/react";
export type { ButtonProps } from "@carbon/react";

// --- Text inputs ---------------------------------------------------------
export { TextInput, TextArea, PasswordInput, NumberInput, Search } from "@carbon/react";

// --- Selection -----------------------------------------------------------
// `Dropdown` and `Toggle` are aliased with a `Carbon` prefix because the lib
// already exports its own (feature-level) `Dropdown`/`Toggle` under those names.
export {
  Dropdown as CarbonDropdown,
  ComboBox,
  MultiSelect,
  FilterableMultiSelect,
  Select,
  SelectItem,
  SelectItemGroup,
  Checkbox,
  CheckboxGroup,
  RadioButton,
  RadioButtonGroup,
  Toggle as CarbonToggle,
  Slider,
} from "@carbon/react";

// --- Overlays ------------------------------------------------------------
export {
  Modal,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Popover,
  PopoverContent,
  DefinitionTooltip,
  Toggletip,
  ToggletipButton,
  ToggletipContent,
  Menu,
  MenuItem,
  MenuItemDivider,
  MenuItemSelectable,
  OverflowMenu,
  OverflowMenuItem,
} from "@carbon/react";

// --- Surfaces / containers ----------------------------------------------
export { Tile, ClickableTile, ExpandableTile, SelectableTile } from "@carbon/react";

// --- Data display --------------------------------------------------------
export {
  Tag,
  DismissibleTag,
  // `Tabs` is aliased — the lib exports its own feature-level `Tabs`.
  Tabs as CarbonTabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Accordion,
  AccordionItem,
  DataTable,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  TableSelectRow,
  TableSelectAll,
  // `Pagination` is aliased — the lib exports its own feature-level `Pagination`.
  Pagination as CarbonPagination,
  PaginationNav,
  Link,
  Breadcrumb,
  BreadcrumbItem,
} from "@carbon/react";

// --- Date & time ---------------------------------------------------------
export { DatePicker, DatePickerInput, TimePicker, TimePickerSelect } from "@carbon/react";

// --- Feedback / status ---------------------------------------------------
export {
  Loading,
  InlineLoading,
  ProgressBar,
  InlineNotification,
  ToastNotification,
  ActionableNotification,
  SkeletonText,
  SkeletonPlaceholder,
  SkeletonIcon,
} from "@carbon/react";

// --- Navigation / switching ---------------------------------------------
export { ContentSwitcher, Switch } from "@carbon/react";

// --- Layout / typography -------------------------------------------------
export { Grid, Column, Stack, FlexGrid, Row, Heading, Section } from "@carbon/react";

// --- Theme boundary ------------------------------------------------------
export { GlobalTheme, Theme } from "@carbon/react";

// --- Custom primitives (no Carbon core equivalent) ----------------------
export { SidePanel } from "./SidePanel";
export type { SidePanelProps } from "./SidePanel";

// `Tooltip` is a thin wrapper (not a plain re-export) so the whole monorepo
// gets `autoAlign` on by default — top-of-viewport tooltips flip into view
// instead of clipping off-screen. See ./Tooltip.
export { Tooltip } from "./Tooltip";
export type { TooltipProps } from "./Tooltip";
