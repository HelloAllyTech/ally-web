import React, { lazy, Suspense, useState } from "react";

import { ContentSwitcher, Switch } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";

import { ArcView } from "./arc/ArcView";
import { OutlineView } from "./outline/OutlineView";

/**
 * Lazy boundary for the state-machine canvas so @xyflow/react (and its
 * stylesheet) ship as their own chunk, loaded only when the canvas view is
 * actually selected.
 */
const StateMachineCanvas = lazy(() => import("./StateMachineCanvas"));

type Presentation = "journey" | "outline" | "canvas";

const STORAGE_KEY = "roleplayStudio.stateMachineView";

const PRESENTATIONS: Presentation[] = ["journey", "outline", "canvas"];

const readStoredView = (): Presentation => {
  if (typeof window === "undefined") return "journey";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return PRESENTATIONS.includes(stored as Presentation) ? (stored as Presentation) : "journey";
};

const CanvasSkeleton: React.FC = () => (
  <div
    className="h-full w-full animate-pulse rounded-lg border border-border-light bg-neutral-50"
    data-testid="state-machine-skeleton"
  />
);

/**
 * The state machine has three interchangeable presentations behind one
 * `{ readOnly }` contract: the layout-free Journey (default) and Outline views,
 * and the original React Flow canvas (kept lazy — its chunk only loads when the
 * trainer picks it). All three read/write the same spec slice, so switching
 * never loses edits. `highlightStateId` lets a future live preview spotlight the
 * client's current state in whichever view is showing.
 */
export const StateMachineEditor: React.FC<{
  readOnly?: boolean;
  highlightStateId?: string;
}> = ({ readOnly = false, highlightStateId }) => {
  const strings = en.roleplayStudio.stateMachine;
  const [view, setView] = useState<Presentation>(readStoredView);

  const selectView = (next: Presentation) => {
    setView(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  };

  const selectedIndex = PRESENTATIONS.indexOf(view);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 justify-end">
        <div className="w-72">
          <ContentSwitcher
            size="sm"
            selectedIndex={selectedIndex < 0 ? 0 : selectedIndex}
            onChange={({ index }) => selectView(PRESENTATIONS[index ?? 0])}
          >
            <Switch name="journey" text={strings.viewJourney} />
            <Switch name="outline" text={strings.viewOutline} />
            <Switch name="canvas" text={strings.viewCanvas} />
          </ContentSwitcher>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {view === "journey" && <ArcView readOnly={readOnly} highlightStateId={highlightStateId} />}
        {view === "outline" && (
          <OutlineView readOnly={readOnly} highlightStateId={highlightStateId} />
        )}
        {view === "canvas" && (
          <Suspense fallback={<CanvasSkeleton />}>
            <StateMachineCanvas readOnly={readOnly} />
          </Suspense>
        )}
      </div>
    </div>
  );
};
