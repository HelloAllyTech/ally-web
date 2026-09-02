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
  UserSpeaker as CUserSpeaker,
  Chemistry as CChemistry,
  Roadmap as CRoadmap,
  Tools as CTools,
  Idea as CIdea,
  Debug as CDebug,
  Pin as CPin,
  Split as CSplit,
  Merge as CMerge,
  Bullhorn as CBullhorn,
  Link as CLink,
  SortAscending as CSortAscending,
  SortDescending as CSortDescending,
  Currency as CCurrency,
  Checkmark as CCheckmark,
  CheckmarkFilled as CCheckmarkFilled,
  CheckmarkOutline as CCheckmarkOutline,
  ChevronDown as CChevronDown,
  ChevronRight as CChevronRight,
  ChevronUp as CChevronUp,
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
  Save as CSave,
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
  MachineLearningModel as CMachineLearningModel,
  Catalog as CCatalog,
  Security as CSecurity,
  Locked as CLocked,
  Mobile as CMobile,
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
export const ArrowUp = createCarbonIcon(CChevronUp);
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
export const Roadmap = createCarbonIcon(CRoadmap);
export const Tools = createCarbonIcon(CTools);
export const Idea = createCarbonIcon(CIdea);
// NOTE: @carbon/icons-react has no `Bug`. Debug is the bug glyph.
export const Debug = createCarbonIcon(CDebug);
export const Pin = createCarbonIcon(CPin);
export const Split = createCarbonIcon(CSplit);
export const Merge = createCarbonIcon(CMerge);
export const Bullhorn = createCarbonIcon(CBullhorn);
export const Link = createCarbonIcon(CLink);
export const Locked = createCarbonIcon(CLocked);
export const SortAscending = createCarbonIcon(CSortAscending);
export const SortDescending = createCarbonIcon(CSortDescending);
export const Currency = createCarbonIcon(CCurrency);
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
/** Voices (TTS) — a persona with a speaker, i.e. the side that talks. The
 *  microphone belongs to Speech Recognition, the side that listens. */
export const UserSpeaker = createCarbonIcon(CUserSpeaker);
/** Language Model (LLM) registry. */
export const MachineLearningModel = createCarbonIcon(CMachineLearningModel);
/** Model Catalog tab — the list of models, distinct from Language Model configs. */
export const Catalog = createCarbonIcon(CCatalog);
/** Guardrails tab — Carbon's shield-with-a-checkmark, the same metaphor as the
 *  Material Symbols glyph it replaces. Not left as a custom SVG: that one was
 *  drawn on a 24-unit grid with 2-unit strokes and sized 21x23, so in the
 *  sidebar it rendered visibly heavier than the thin-line Carbon glyphs around
 *  it. */
export const Guardrails = createCarbonIcon(CSecurity);
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
export const Save = createCarbonIcon(CSave);
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
export const Mobile = createCarbonIcon(CMobile);
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
/**
 * Material Symbols "vertical_align_top" — the votes-budget glyph in the roadmap header.
 *
 * A Material Symbol rather than a Carbon icon because Carbon has no equivalent mark: its
 * arrows are directional, and this is "to the top", which is what a vote does to a queue
 * position.
 *
 * TWO THINGS MAKE THIS WORK, and both are easy to miss:
 *  1. `index.html` requests a RESTRICTED subset (`icon_names=…`). A symbol missing from that
 *     list renders as its literal ligature text — "vertical_align_top" in words — not as a
 *     blank. If you add another symbol anywhere, add its name there too.
 *  2. The weight/grade/optical-size come from `.material-symbols-outlined` in styles.css, which
 *     already carries FILL 0 / wght 100 / GRAD -25 / opsz 24. Size is set per use site rather
 *     than globally, so this cannot restyle the tooltip glyph.
 */
/**
 * Renders one Material Symbol.
 *
 * Takes `size` like the Carbon wrappers above so a symbol and a Carbon icon are interchangeable
 * at a call site — `<Icon size={18} />` has to mean the same thing whichever set it came from,
 * or every icon map needs to know which kind each entry is. Size lands as font-size because a
 * symbol is a glyph, not an svg.
 */
const materialSymbol = (name: string) => {
  function Symbol({ size, width, height, className }: IconProps) {
    // size ?? width ?? height, the same precedence createCarbonIcon uses — so a call site can
    // pass whichever it likes and a Carbon icon, an SVGR asset and a symbol stay interchangeable.
    const resolved = size ?? width ?? height ?? DEFAULT_SIZE;
    return (
      <span
        className={["material-symbols-outlined leading-none", className].filter(Boolean).join(" ")}
        style={{ fontSize: typeof resolved === "number" ? `${resolved}px` : resolved }}
        aria-hidden="true"
      >
        {name}
      </span>
    );
  }
  Symbol.displayName = `MaterialSymbol(${name})`;
  return Symbol;
};

export const VerticalAlignTopIcon = materialSymbol("vertical_align_top");

/*
 * Material Symbol twins for two Carbon glyphs, used where a row of icons has to read as one
 * weight. Carbon's icons are FILLED PATHS, not strokes, so there is no thickness to turn down —
 * next to a `wght 100` symbol they look like a different family, because they are. These carry
 * the same variation settings as every other symbol (see .material-symbols-outlined in
 * styles.css), so a row built from them is uniformly thin-line.
 *
 * Added rather than swapped into `Idea`/`Debug`: those two are the app-wide Carbon exports with
 * call sites well outside the roadmap, and changing them would restyle every one of those.
 *
 * Both names MUST stay in index.html's `icon_names` subset. The font is requested with an
 * explicit glyph list, so a symbol missing from it renders as its own name in words.
 */
export const LightbulbIcon = materialSymbol("lightbulb");
export const BugReportIcon = materialSymbol("bug_report");
/*
 * An OUTLINED triangle. The Material Symbols name for it is "change_history", which has nothing
 * to do with what it draws — the glyph is a plain equilateral triangle and the name is a relic of
 * its original use. Aliased here so call sites read as what they render.
 *
 * Not "arrow_drop_up": that one is a solid wedge, and a filled shape ignores the `wght 100` the
 * rest of this row is drawn at, so it lands noticeably heavier than its neighbours.
 */
export const TriangleIcon = materialSymbol("change_history");

/*
 * Thin-line glyphs for the roadmap Queue's collapsed toolbar controls.
 *
 * Material Symbols rather than the Carbon `Filter` / `Flag` / `SortAscending` already exported
 * above, for the reason given on LightbulbIcon: Carbon draws filled paths with no weight to turn
 * down, and this toolbar sits under a header row drawn at `wght 100`.
 *
 * BackArrowIcon is the collapse affordance, NOT navigation — it returns an expanded control to
 * its icon. Named for the glyph rather than for "collapse" so a future call site that wants a
 * back arrow for something else is not misled by the name.
 */
export const SortIcon = materialSymbol("sort");
export const GoalIcon = materialSymbol("flag");
export const PersonIcon = materialSymbol("person");
export const BackArrowIcon = materialSymbol("arrow_back");
/**
 * The Builder agent — "auto_awesome", the sparkles that read as AI across most products people
 * already use, rather than a robot. Named for the thing it opens, not the glyph, so swapping the
 * symbol again does not mean touching every call site.
 */
export const BuilderAgentIcon = materialSymbol("auto_awesome");
/**
 * The roadmap's admin drawer — product goals, strategy & ranking, merge and split.
 *
 * A Material Symbol, not the Carbon `Settings` exported above, because this sits in the roadmap
 * header beside LightbulbIcon and BugReportIcon: Carbon draws filled paths with no weight to turn
 * down, so a Carbon gear lands visibly heavier than the `wght 100` symbols either side of it.
 *
 * REPLACES StrategyRankIcon (`materialSymbol("balance")`), which was removed rather than left
 * unused — "balance" was never added to index.html's `icon_names` subset, so for as long as it
 * shipped it rendered as the literal word BALANCE next to the Product Roadmap title. "settings"
 * IS in that list; adding it there is the other half of this change, and the reason this file's
 * warning about the subset is not decoration.
 */
export const RoadmapSettingsIcon = materialSymbol("settings");

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

/**
 * Illustrated baby (SVG Repo / Noto). Used for the queue's "Latest first" sort.
 *
 * FULL COLOUR, so it does NOT follow `currentColor`: it renders identically whether its button is
 * selected or not. In a set that signals state through colour, that signal is lost for this one
 * icon — `aria-pressed` has to carry it instead.
 *
 * It also carries an `id` on an internal radialGradient. Harmless while it renders once per page;
 * two instances would duplicate that id, which is invalid markup even though browsers tolerate it.
 *
 * Its hardcoded `width`/`height="800px"` were STRIPPED on import — left in, they beat the props a
 * call site passes and the icon renders at 800px.
 */
export { default as Baby } from "@assets/svg/baby.svg?react";

/**
 * Illustrated star (SVG Repo). Used for the queue's "By rank" sort.
 *
 * Full colour, so it does not follow `currentColor` — see the note on Baby above; the same
 * caveats about selection colour apply.
 *
 * Its hardcoded `width`/`height="800px"` were STRIPPED on import. Left in, they beat the props a
 * call site passes and the icon renders at 800px — which it did, once, filling the page.
 */
export { default as Star } from "@assets/svg/star.svg?react";

/**
 * Illustrated older woman (SVG Repo / Emoji One). Used for the queue's "Oldest first" sort.
 *
 * Pairs with Baby: newest ↔ oldest as an age metaphor rather than two sort arrows. Same caveats
 * as the other two illustrations — full colour, so no selection tint, and its pixel `width`/
 * `height` were stripped on import.
 */
export { default as OldWoman } from "@assets/svg/old-woman.svg?react";
export { default as Ally } from "@assets/svg/ally.svg?react";
export { default as BinaryClassification } from "@assets/svg/binaryClassification.svg?react";
export { default as Case } from "@assets/svg/case.svg?react";
export { default as CharacterLibrary } from "@assets/svg/characterLibrary.svg?react";
export { default as Contribution } from "@assets/svg/contribution.svg?react";
export { default as DiamondShine } from "@assets/svg/diamond_shine.svg?react";
export { default as FrameSource } from "@assets/svg/frameSource.svg?react";
export { default as Pathway } from "@assets/svg/pathway.svg?react";
export { default as SemanticSimilarity } from "@assets/svg/semanticSimilarity.svg?react";
export { default as Simulation } from "@assets/svg/simulation.svg?react";
export { default as WandStars } from "@assets/svg/wandStars.svg?react";
