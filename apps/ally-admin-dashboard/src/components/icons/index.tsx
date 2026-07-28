/**
 * Central icon library for the admin dashboard.
 *
 * All generic UI icons are backed by IBM Carbon (`@carbon/icons-react`) using
 * Carbon's thin-line outline style. Brand / domain-specific icons that have no
 * good Carbon equivalent continue to render the original custom SVGs under
 * `src/assets/svg/` (those files are intentionally preserved on disk).
 *
 * The legacy `@assets` barrel (`src/assets/svg/index.ts`) re-exports everything
 * from here, so existing `import { Add } from "@assets"` call sites resolve to
 * these Carbon-backed components with no edits.
 *
 * `createCarbonIcon` adapts the legacy SVGR prop surface (`width`/`height`,
 * `className`, `onClick`) onto Carbon's single `size` prop. Carbon renders
 * an svg with `fill="currentColor"`, so colour is driven by CSS `color` /
 * Tailwind text-colour classes; Tailwind width/height classes still override
 * the size attributes.
 */
import type { SVGProps } from "react";

import {
  Add as CAdd,
  Alarm as CAlarm,
  Archive as CArchive,
  ArrowLeft as CArrowLeft,
  ArrowRight as CArrowRight,
  Badge as CBadge,
  Book as CBook,
  Branch as CBranch,
  Calendar as CCalendar,
  ChartBar as CChartBar,
  Chat as CChat,
  Chemistry as CChemistry,
  Checkmark as CCheckmark,
  CheckmarkFilled as CCheckmarkFilled,
  CheckmarkOutline as CCheckmarkOutline,
  ChevronDown as CChevronDown,
  ChevronRight as CChevronRight,
  Close as CClose,
  CloudUpload as CCloudUpload,
  Copy as CCopy,
  DataTable as CDataTable,
  Document as CDocument,
  DotMark as CDotMark,
  Download as CDownload,
  Draggable as CDraggable,
  Edit as CEdit,
  Filter as CFilter,
  FaceSatisfied as CFaceSatisfied,
  Flag as CFlag,
  Flash as CFlash,
  FlowConnection as CFlowConnection,
  Globe as CGlobe,
  Group as CGroup,
  Image as CImage,
  Information as CInformation,
  ListBulleted as CListBulleted,
  ListNumbered as CListNumbered,
  Logout as CLogout,
  Maximize as CMaximize,
  Microphone as CMicrophone,
  Minimize as CMinimize,
  Misuse as CMisuse,
  OpenPanelRight as COpenPanelRight,
  OverflowMenuHorizontal as COverflowMenuHorizontal,
  Pause as CPause,
  Play as CPlay,
  Quotes as CQuotes,
  Renew as CRenew,
  Restart as CRestart,
  Search as CSearch,
  Settings as CSettings,
  SkillLevel as CSkillLevel,
  Subtract as CSubtract,
  Terminal as CTerminal,
  TextBold as CTextBold,
  TextItalic as CTextItalic,
  TextStrikethrough as CTextStrikethrough,
  TextUnderline as CTextUnderline,
  Time as CTime,
  Translate as CTranslate,
  TrashCan as CTrashCan,
  Tree as CTree,
  Upload as CUpload,
  UserAvatar as CUserAvatar,
  UserMultiple as CUserMultiple,
  Video as CVideo,
  View as CView,
  ViewOff as CViewOff,
  WarningAlt as CWarningAlt,
  ZoomIn as CZoomIn,
} from "@carbon/icons-react";
import { Heading1 as LHeading1, Heading2 as LHeading2, Heading3 as LHeading3 } from "lucide-react";

import type { CarbonIconType } from "@carbon/icons-react";

// Carbon has no H1/H2/H3 glyphs; keep lucide's for level distinction in the
// rich-text toolbar, routed through this central module so the import surface
// stays unified.

const DEFAULT_SIZE = 16;

type CarbonIconProps = {
  size?: number | string;
} & Omit<SVGProps<SVGSVGElement>, "ref">;

/** Superset of the legacy SVGR prop surface used across the app. */
export type IconProps = CarbonIconProps & {
  width?: number | string;
  height?: number | string;
};

/**
 * Wrap a Carbon icon so it accepts the legacy `width`/`height` props and an
 * optional baked-in className (used to preserve the colour of variant icons
 * such as `TrashRed`).
 */
function createCarbonIcon(CarbonComp: CarbonIconType, options?: { className?: string }) {
  function Icon({ size, width, height, className, ...rest }: IconProps) {
    const resolvedSize = size ?? width ?? height ?? DEFAULT_SIZE;
    const mergedClassName = [options?.className, className].filter(Boolean).join(" ") || undefined;
    return <CarbonComp size={resolvedSize} className={mergedClassName} {...rest} />;
  }
  Icon.displayName = CarbonComp.displayName ?? "CarbonIcon";
  return Icon;
}

/* -------------------------------------------------------------------------- */
/* Generic UI icons (Carbon outline)                                          */
/* -------------------------------------------------------------------------- */

export const AccountTree = createCarbonIcon(CTree);
export const Add = createCarbonIcon(CAdd);
export const AlarmOn = createCarbonIcon(CAlarm);
export const Archive = createCarbonIcon(CArchive);
export const ArrowDown = createCarbonIcon(CChevronDown);
export const ArrowDownFilled = createCarbonIcon(CChevronDown);
export const ArrowSolid = createCarbonIcon(CArrowRight);
export const BackCircle = createCarbonIcon(CArrowLeft);
export const BackIcon = createCarbonIcon(CArrowLeft);
export const Badge = createCarbonIcon(CBadge);
export const Bolt = createCarbonIcon(CFlash);
export const Book = createCarbonIcon(CBook);
export const Branch = createCarbonIcon(CBranch);
export const Calendar = createCarbonIcon(CCalendar);
export const Cancel = createCarbonIcon(CClose);
export const Chat = createCarbonIcon(CChat);
export const Chemistry = createCarbonIcon(CChemistry);
export const CheckCircle = createCarbonIcon(CCheckmarkOutline);
export const Close = createCarbonIcon(CClose);
export const Compress = createCarbonIcon(CMinimize);
export const Copy = createCarbonIcon(CCopy);
export const Delete = createCarbonIcon(CTrashCan);
export const DockToRight = createCarbonIcon(COpenPanelRight);
export const Document = createCarbonIcon(CDocument);
export const Dot = createCarbonIcon(CDotMark);
export const DoubleArrowRight = createCarbonIcon(CChevronRight);
export const Download = createCarbonIcon(CDownload);
export const DragIndicator = createCarbonIcon(CDraggable);
export const DragUpload = createCarbonIcon(CUpload);
export const Edit = createCarbonIcon(CEdit);
export const Eye = createCarbonIcon(CView);
export const FailIcon = createCarbonIcon(CMisuse);
export const Filter = createCarbonIcon(CFilter);
export const FocusLens = createCarbonIcon(CZoomIn);
export const Globe = createCarbonIcon(CGlobe);
export const GroupBranch = createCarbonIcon(CFlowConnection);
export const HappyEmoji = createCarbonIcon(CFaceSatisfied);
export const ImageIcon = createCarbonIcon(CImage);
export const InfoIcon = createCarbonIcon(CInformation);
export const Logout = createCarbonIcon(CLogout);
export const ManageAccounts = createCarbonIcon(CUserMultiple);
export const Maximize = createCarbonIcon(CMaximize);
export const Mic = createCarbonIcon(CMicrophone);
export const PauseIcon = createCarbonIcon(CPause);
export const Play = createCarbonIcon(CPlay);
export const PlayIcon = createCarbonIcon(CPlay);
export const Plus = createCarbonIcon(CAdd);
export const Refresh = createCarbonIcon(CRenew);
export const Search = createCarbonIcon(CSearch);
export const TableIcon = createCarbonIcon(CDataTable);
export const ThreeDot = createCarbonIcon(COverflowMenuHorizontal);
export const Tick = createCarbonIcon(CCheckmark);
export const Timer = createCarbonIcon(CTime);
export const Trash = createCarbonIcon(CTrashCan);
export const Unarchive = createCarbonIcon(CArchive);
export const Unpublish = createCarbonIcon(CViewOff);
export const Upload = createCarbonIcon(CUpload);
export const UploadImage = createCarbonIcon(CUpload);
export const User = createCarbonIcon(CUserAvatar);
export const Users = createCarbonIcon(CGroup);
export const VideoCamera = createCarbonIcon(CVideo);
export const WarningAlt = createCarbonIcon(CWarningAlt);

/* -------------------------------------------------------------------------- */
/* Colour variants — same Carbon glyph, original colour preserved via CSS     */
/* -------------------------------------------------------------------------- */

export const AddBlue = createCarbonIcon(CAdd, { className: "text-[#0957D0]" });
export const BlueAdd = createCarbonIcon(CAdd, { className: "text-[#0957D0]" });
export const CloseRed = createCarbonIcon(CClose, { className: "text-[#F93535]" });
export const TrashRed = createCarbonIcon(CTrashCan, { className: "text-[#FE6F64]" });
export const BookWhite = createCarbonIcon(CBook, { className: "text-white" });
export const BlackTick = createCarbonIcon(CCheckmark, { className: "text-[#212121]" });
export const TickGreenBackground = createCarbonIcon(CCheckmarkFilled, {
  className: "text-[#66BB6A]",
});

/* -------------------------------------------------------------------------- */
/* lucide / Material-Symbols / inline-SVG replacements (Carbon)               */
/* -------------------------------------------------------------------------- */

export const BarChart3 = createCarbonIcon(CChartBar);
export const Info = createCarbonIcon(CInformation);
export const Languages = createCarbonIcon(CTranslate);
export const Settings = createCarbonIcon(CSettings);
export const Flag = createCarbonIcon(CFlag);
export const SkillLevel = createCarbonIcon(CSkillLevel);
export const Bold = createCarbonIcon(CTextBold);
export const Italic = createCarbonIcon(CTextItalic);
export const Underline = createCarbonIcon(CTextUnderline);
export const Strikethrough = createCarbonIcon(CTextStrikethrough);
export const List = createCarbonIcon(CListBulleted);
export const ListOrdered = createCarbonIcon(CListNumbered);
export const Quote = createCarbonIcon(CQuotes);
export const Minus = createCarbonIcon(CSubtract);
export const RefreshCw = createCarbonIcon(CRenew);
export const RotateCcw = createCarbonIcon(CRestart);
export const UploadCloud = createCarbonIcon(CCloudUpload);
export const Terminal = createCarbonIcon(CTerminal);
/** Inline-SVG trash replacement (kept distinct name for the call site). */
export const TrashCan = createCarbonIcon(CTrashCan);

// Heading levels: lucide (no Carbon equivalent). Already accept `size`/`className`.
export const Heading1 = LHeading1;
export const Heading2 = LHeading2;
export const Heading3 = LHeading3;

/* -------------------------------------------------------------------------- */
/* Tooltip trigger glyph — Material Symbols "sticky_note" (thin)               */
/* -------------------------------------------------------------------------- */

/**
 * Standard tooltip affordance across the admin. Unlike the Carbon icons above
 * this renders the Material Symbols "sticky_note" glyph via a ligature span —
 * the font is loaded in index.html (`icon_names=sticky_note,...`) and the thin
 * variation-settings + sizing live in styles.css under `.tooltip-icon`. Colour
 * follows the surrounding `color` (`currentColor`), same as the Carbon icons.
 * Drop-in for the old `InfoIcon` tooltip trigger; `width`/`height`/`size` are
 * accepted but ignored (sizing is CSS-driven for visual consistency).
 */
export const TooltipIcon = ({ className }: IconProps) => (
  <span
    className={["material-symbols-outlined tooltip-icon", className].filter(Boolean).join(" ")}
    aria-hidden="true"
  >
    sticky_note
  </span>
);

/* -------------------------------------------------------------------------- */
/* Brand / domain-specific icons — preserved as the original custom SVGs      */
/* -------------------------------------------------------------------------- */

export { default as Ally } from "@assets/svg/ally.svg?react";
export { default as BinaryClassification } from "@assets/svg/binaryClassification.svg?react";
export { default as Case } from "@assets/svg/case.svg?react";
export { default as CharacterLibrary } from "@assets/svg/characterLibrary.svg?react";
export { default as Contribution } from "@assets/svg/contribution.svg?react";
export { default as DiamondShine } from "@assets/svg/diamond_shine.svg?react";
export { default as FrameSource } from "@assets/svg/frameSource.svg?react";
export { default as Guardrails } from "@assets/svg/guardrails.svg?react";
export { default as Pathway } from "@assets/svg/pathway.svg?react";
export { default as SemanticSimilarity } from "@assets/svg/semanticSimilarity.svg?react";
export { default as Simulation } from "@assets/svg/simulation.svg?react";
export { default as WandStars } from "@assets/svg/wandStars.svg?react";
