import { FunctionComponent, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { Information } from "@carbon/icons-react";

const BUBBLE_MAX_WIDTH = 280;
/** Gap between the icon and the bubble, and the minimum inset from the viewport edge. */
const OFFSET = 6;
const VIEWPORT_INSET = 8;

interface HeaderTooltipProps {
  /** The explanation. Also the accessible name — screen readers get the text, not the icon. */
  text: string;
}

/**
 * Explainer for a column header.
 *
 * Portaled to `document.body` and `position: fixed` deliberately, following the
 * CustomMenu pattern. A Carbon `Tooltip` cannot be used here: it renders its
 * bubble inline rather than portaling, and GenericTable wraps its table in
 * `overflow-x-auto` — which per CSS makes the vertical axis clip too — so an
 * inline bubble is cut off by the scroll container and looks like nothing
 * happened on hover. See the NavSideBar/Drawer tooltip clipping precedents.
 *
 * Click is swallowed: the header cell's own onClick opens the sort/filter
 * popover, and this icon is an explainer, not a control.
 */
export const HeaderTooltip: FunctionComponent<HeaderTooltipProps> = ({ text }) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Clamp so a right-hand column's bubble doesn't run off the viewport —
    // this table scrolls sideways, so the last columns sit near the edge.
    const maxLeft = window.innerWidth - BUBBLE_MAX_WIDTH - VIEWPORT_INSET;
    setPosition({
      top: rect.bottom + OFFSET,
      left: Math.max(VIEWPORT_INSET, Math.min(rect.left, maxLeft)),
    });
  };

  const hide = () => setPosition(null);

  return (
    <span
      ref={anchorRef}
      className="ml-1 inline-flex items-center text-[#8D8D8D] hover:text-[#525252] focus:text-[#525252] outline-none"
      onClick={e => e.stopPropagation()}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      aria-label={text}
      data-testid="header-tooltip"
    >
      <Information size={14} />
      {position &&
        createPortal(
          <div
            role="tooltip"
            className="fixed z-[9999] rounded bg-[#393939] px-3 py-2 text-[12px] font-normal leading-[16px] text-white shadow-lg pointer-events-none"
            style={{ top: position.top, left: position.left, maxWidth: BUBBLE_MAX_WIDTH }}
          >
            {text}
          </div>,
          document.body,
        )}
    </span>
  );
};

export default HeaderTooltip;
