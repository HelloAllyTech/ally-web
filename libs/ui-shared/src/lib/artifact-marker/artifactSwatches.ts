/**
 * The eight annotation label swatches, mirroring `AnnotationSwatch` in ally-be.
 *
 * Deliberately hex rather than Tailwind classes: this component renders inside
 * three apps whose Tailwind themes each extend `colors` differently, and a
 * shared lib can't rely on a utility class surviving another app's purge. Hex
 * guarantees an author and a learner see the same colour.
 *
 * Colour is never the only signal — every mark also carries its label's text,
 * and reveal states carry a word ("Found" / "Missed" / "Not here").
 */
export type ArtifactSwatch =
  | "amber"
  | "teal"
  | "violet"
  | "rose"
  | "blue"
  | "green"
  | "orange"
  | "slate";

export interface SwatchTokens {
  /** The solid dot / chip fill. */
  solid: string;
  /** Row background when a unit carries this label. */
  tint: string;
  /** Row border when a unit carries this label. */
  border: string;
  /** Text colour on the tint. Contrast-checked against `tint` at AA. */
  text: string;
}

export const ARTIFACT_SWATCHES: Record<ArtifactSwatch, SwatchTokens> = {
  amber: { solid: "#B45309", tint: "#FEF3C7", border: "#D97706", text: "#78350F" },
  teal: { solid: "#0F766E", tint: "#CCFBF1", border: "#0D9488", text: "#134E4A" },
  violet: { solid: "#6D28D9", tint: "#EDE9FE", border: "#7C3AED", text: "#4C1D95" },
  rose: { solid: "#BE123C", tint: "#FFE4E6", border: "#E11D48", text: "#881337" },
  blue: { solid: "#1D4ED8", tint: "#DBEAFE", border: "#2563EB", text: "#1E3A8A" },
  green: { solid: "#15803D", tint: "#DCFCE7", border: "#16A34A", text: "#14532D" },
  orange: { solid: "#C2410C", tint: "#FFEDD5", border: "#EA580C", text: "#7C2D12" },
  slate: { solid: "#334155", tint: "#E2E8F0", border: "#475569", text: "#1E293B" },
};

export const ARTIFACT_SWATCH_ORDER: ArtifactSwatch[] = [
  "amber",
  "teal",
  "violet",
  "rose",
  "blue",
  "green",
  "orange",
  "slate",
];

/** Verdict colours for the post-submit reveal. Independent of label swatches. */
export const ARTIFACT_VERDICT_TOKENS = {
  found: { tint: "#DCFCE7", border: "#16A34A", text: "#14532D" },
  missed: { tint: "#FEF3C7", border: "#D97706", text: "#78350F" },
  notHere: { tint: "#FEE2E2", border: "#DC2626", text: "#7F1D1D" },
} as const;
