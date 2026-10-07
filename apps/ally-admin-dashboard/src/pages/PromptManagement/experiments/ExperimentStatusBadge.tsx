import React from "react";

import { en } from "@constants";
import { SkillExperimentStatus, SkillVariantStatus } from "@types";

const BADGE = "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border";

const EXPERIMENT_STYLES: Record<SkillExperimentStatus, string> = {
  off: "bg-neutral-100 text-typography-600 border-border-light",
  baseline: "bg-blue-50 text-blue-700 border-blue-200",
  testing: "bg-amber-50 text-amber-700 border-amber-200",
  paused: "bg-green-50 text-green-700 border-green-200",
};

const VARIANT_STYLES: Record<SkillVariantStatus, string> = {
  champion: "bg-green-50 text-green-700 border-green-200",
  challenger: "bg-amber-50 text-amber-700 border-amber-200",
  retired: "bg-neutral-100 text-typography-600 border-border-light",
  rejected: "bg-destructive-50 text-destructive-700 border-destructive-200",
};

/** The experiment's state, in words — never colour alone. */
export const ExperimentStatusBadge: React.FC<{ status: SkillExperimentStatus }> = ({ status }) => (
  <span className={`${BADGE} ${EXPERIMENT_STYLES[status]}`}>
    {en.skillExperiments.status[status]}
  </span>
);

export const VariantStatusBadge: React.FC<{ status: SkillVariantStatus }> = ({ status }) => (
  <span className={`${BADGE} ${VARIANT_STYLES[status]}`}>
    {en.skillExperiments.variants.status[status]}
  </span>
);
