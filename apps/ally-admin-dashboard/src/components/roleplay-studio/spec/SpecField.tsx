import React from "react";

import { Tag } from "@ally-ui-mono/ui-shared";

/**
 * Read-only label + value pair used across the (mostly read-only) spec
 * sections. Renders an em-dash when empty so the layout never collapses.
 * `value` may be plain text or arbitrary nodes (e.g. rendered HTML / tags).
 */
export const SpecValue: React.FC<{
  label: string;
  value?: React.ReactNode;
  /** True when `value` is a non-empty string worth showing as-is. */
  isEmpty?: boolean;
}> = ({ label, value, isEmpty }) => {
  const empty = isEmpty ?? (typeof value === "string" ? value.trim() === "" : value == null);
  return (
    <div className="flex flex-col gap-1">
      <p className="cds--label" style={{ marginBottom: 0 }}>
        {label}
      </p>
      {empty ? (
        <p className="text-typography-500">—</p>
      ) : typeof value === "string" ? (
        <p className="text-typography-800 whitespace-pre-wrap break-words">{value}</p>
      ) : (
        <div className="text-typography-800">{value}</div>
      )}
    </div>
  );
};

/** Carbon Tag colour names (the union isn't exported cleanly from the lib). */
type TagColor =
  | "gray"
  | "cool-gray"
  | "warm-gray"
  | "red"
  | "magenta"
  | "purple"
  | "blue"
  | "cyan"
  | "teal"
  | "green"
  | "high-contrast"
  | "outline";

/** A wrapping row of Carbon Tags; renders an em-dash when the list is empty. */
export const SpecTagList: React.FC<{
  items: string[];
  type?: TagColor;
}> = ({ items, type = "gray" }) =>
  items.length === 0 ? (
    <span className="text-typography-500">—</span>
  ) : (
    <div className="flex flex-wrap gap-1">
      {items.map((item, index) => (
        <Tag key={`${item}-${index}`} type={type} size="sm">
          {item}
        </Tag>
      ))}
    </div>
  );
