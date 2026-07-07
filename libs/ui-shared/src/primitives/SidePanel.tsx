"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";

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
  /** Panel width (CSS length). Defaults to 24rem. */
  width?: string;
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
 * centralised implementation used across the apps in place of the various
 * per-app MUI `Drawer` / `*Sidebar` / `*Sidepanel` components. It is styled with
 * Carbon design tokens (`--cds-*`) only, so it inherits the serif Carbon look
 * everywhere and needs no app-level Tailwind config.
 */
export function SidePanel({
  open,
  onClose,
  title,
  side = "right",
  width = "24rem",
  closeLabel = "Close",
  children,
}: SidePanelProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const panelStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    bottom: 0,
    [side]: 0,
    width,
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
    padding: "1rem",
    borderBottom: "1px solid var(--cds-border-subtle, #e0e0e0)",
    fontWeight: 600,
  };

  return (
    <>
      <div style={OVERLAY_STYLE} onClick={onClose} aria-hidden="true" />
      <aside style={panelStyle} role="dialog" aria-modal="true">
        <div style={headerStyle}>
          <span>{title}</span>
          <IconButton label={closeLabel} kind="ghost" size="sm" onClick={onClose}>
            <Close />
          </IconButton>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "1rem" }}>{children}</div>
      </aside>
    </>
  );
}

export default SidePanel;
