import React, { lazy, Suspense } from "react";

/**
 * Lazy boundary for the state-machine canvas so @xyflow/react (and its
 * stylesheet) ship as their own chunk, loaded only when the spec step opens.
 */
const StateMachineCanvas = lazy(() => import("./StateMachineCanvas"));

const CanvasSkeleton: React.FC = () => (
  <div
    className="h-full w-full animate-pulse rounded-lg border border-border-light bg-neutral-50"
    data-testid="state-machine-skeleton"
  />
);

export const StateMachineEditor: React.FC<{ readOnly?: boolean }> = ({ readOnly = false }) => (
  <Suspense fallback={<CanvasSkeleton />}>
    <StateMachineCanvas readOnly={readOnly} />
  </Suspense>
);
