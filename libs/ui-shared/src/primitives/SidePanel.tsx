"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

import { Close } from "@carbon/icons-react";
import { IconButton } from "@carbon/react";

export interface SidePanelProps {
  /** Whether the panel is visible. */
  open: boolean;
  /** Called when the user requests to close (overlay click, Escape, close button). */
  onClose: () => void;
  /** Panel heading, rendered in the header next to the close button. */
  title?: ReactNode;
  /** Which edge the panel slides in from. */
  side?: "left" | "right";
  /**
   * Panel width (CSS length). Defaults to 24rem. Ignored when `className`
   * carries its own width utility (the class then controls sizing).
   */
  width?: string;
  /** Extra classes for the panel `<aside>` (e.g. Tailwind width utilities). */
  className?: string;
  /** Extra classes for the scrollable body. */
  bodyClassName?: string;
  /** Accessible label for the close button. */
  closeLabel?: string;
  children?: ReactNode;
}

const OVERLAY_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 9000,
};

/**
 * Shared slide-over side panel.
 *
 * Carbon core (`@carbon/react`) ships no Drawer/side-panel, so this is the one
 * centralised implementation used in place of the former per-app MUI `Drawer`.
 * It is styled with Carbon design tokens (`--cds-*`) only, so it inherits the
 * serif Carbon look everywhere and needs no app-level Tailwind config.
 *
 * Sizing: pass `width` for a simple fixed width, OR pass `className` with a
 * width utility (e.g. `w-[50vw] min-w-[600px]`) — when `className` is provided
 * the inline width is dropped so the class controls sizing.
 */
export function SidePanel({
  open,
  onClose,
  title,
  side = "right",
  width = "24rem",
  className,
  bodyClassName,
  closeLabel = "Close",
  children,
}: SidePanelProps) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus trap: move focus into the panel on open, keep Tab cycling inside it,
  // and restore focus to the previously-focused element on close.
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            el => el.offsetParent !== null,
          )
        : [];
    (focusables()[0] ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        panel?.focus();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel?.addEventListener("keydown", onKey);
    return () => {
      panel?.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const panelStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    bottom: 0,
    [side]: 0,
    // When the caller supplies its own classes (which may include a width
    // utility) let the class win — an inline width would override Tailwind.
    ...(className ? {} : { width }),
    maxWidth: "100%",
    background: "var(--cds-layer, #ffffff)",
    color: "var(--cds-text-primary, #161616)",
    borderInlineStart: side === "right" ? "1px solid var(--cds-border-subtle, #e0e0e0)" : undefined,
    borderInlineEnd: side === "left" ? "1px solid var(--cds-border-subtle, #e0e0e0)" : undefined,
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    zIndex: 9001,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    padding: "1rem 1.5rem",
    borderBottom: "1px solid var(--cds-border-subtle, #e0e0e0)",
    fontWeight: 600,
    flexShrink: 0,
  };

  return (
    <>
      <div style={OVERLAY_STYLE} onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        style={panelStyle}
        className={className}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <div style={headerStyle}>
          <div style={{ minWidth: 0, flex: 1 }}>{title}</div>
          {/* The close button is pinned to the top of the viewport, so its
              built-in tooltip's default top-alignment would clip off-screen.
              autoAlign flips it back into view (Carbon's IconButton defaults
              autoAlign to false, unlike the shared Tooltip). */}
          <IconButton label={closeLabel} kind="ghost" size="sm" autoAlign onClick={onClose}>
            <Close />
          </IconButton>
        </div>
        <div
          style={{ flex: 1, overflow: "auto", padding: "1rem 1.5rem" }}
          className={bodyClassName}
        >
          {children}
        </div>
      </aside>
    </>
  );
}

export default SidePanel;
