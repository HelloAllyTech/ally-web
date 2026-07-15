import React from "react";

import { Accordion } from "@components";

import { SpecPatchFlash } from "./SpecPatchFlash";

interface SpecSectionCardProps {
  title: string;
  /** Top-level spec keys that trigger this card's patch flash. */
  sections: string[];
  headerActions?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

/** Stacked spec section: accordion card wrapped in the patch-flash halo. */
export const SpecSectionCard: React.FC<SpecSectionCardProps> = ({
  title,
  sections,
  headerActions,
  defaultExpanded = true,
  children,
}) => (
  <SpecPatchFlash sections={sections}>
    <div className="rounded-lg border border-border-light bg-white overflow-hidden">
      <Accordion title={title} headerActions={headerActions} defaultExpanded={defaultExpanded}>
        <div className="px-1 pb-1">{children}</div>
      </Accordion>
    </div>
  </SpecPatchFlash>
);
