import React from "react";

import { en } from "@constants";
import { RoleplayTestCaseVerdict } from "@src/types/roleplayStudio";

/**
 * Small dot-pill for a test-case verdict. Mirrors StatusBadge's visual
 * language but is deliberately NOT StatusBadge — its unknown-key fallback
 * renders green, which would paint an unrecognized verdict as a pass.
 * Unknown verdicts fall back to the neutral style with the raw label.
 */
const VERDICT_STYLES: Record<RoleplayTestCaseVerdict, { dot: string; bg: string }> = {
  PASSED: { dot: "bg-success-400", bg: "bg-success-100" },
  FAILED: { dot: "bg-destructive-400", bg: "bg-destructive-50" },
  INCONCLUSIVE: { dot: "bg-neutral-400", bg: "bg-neutral-100" },
};

const NEUTRAL_STYLE = VERDICT_STYLES.INCONCLUSIVE;

interface VerdictBadgeProps {
  verdict: RoleplayTestCaseVerdict | string;
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict }) => {
  const strings = en.roleplayStudio.rehearsal;
  const { dot, bg } = VERDICT_STYLES[verdict as RoleplayTestCaseVerdict] ?? NEUTRAL_STYLE;
  const label = strings.verdicts[verdict as RoleplayTestCaseVerdict] ?? String(verdict);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-[8px] py-[2px] text-xs text-typography-900 ${bg}`}
      data-testid={`verdict-badge-${verdict}`}
    >
      <span className={`mr-1 h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
};
