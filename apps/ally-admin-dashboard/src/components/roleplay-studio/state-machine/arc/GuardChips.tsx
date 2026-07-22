import React from "react";

import { useSelector } from "react-redux";

import { Tag } from "@ally-ui-mono/ui-shared";
import { selectRoleplaySpec } from "@reducer";
import { RoleplayTransition } from "@src/types/roleplayStudio";

import { guardSummaryParts } from "../arcMapping";

/**
 * A transition's guard conditions as a compact row of pills ("any of: …",
 * "≥2 turns in state", "score ≥ 3"). Behavior ids are resolved to rubric
 * names by `guardSummaryParts`; an unguarded transition shows a single
 * "always" pill.
 */
export const GuardChips: React.FC<{ transition: RoleplayTransition; className?: string }> = ({
  transition,
  className = "",
}) => {
  const spec = useSelector(selectRoleplaySpec);
  const parts = guardSummaryParts(transition, spec?.rubric.behaviors ?? []);

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {parts.map((part, index) => (
        <Tag key={`${part}-${index}`} type="cool-gray" size="sm">
          {part}
        </Tag>
      ))}
    </div>
  );
};
