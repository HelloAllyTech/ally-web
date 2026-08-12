import React, { Suspense, lazy } from "react";

import { SkeletonPlaceholder, SkeletonText } from "@ally-ui-mono/ui-shared";

/**
 * Lazy boundary for the usage dashboard.
 *
 * `@carbon/charts` is by far the heaviest thing this feature pulls in, and the WhatsApp route itself
 * has to load eagerly — six of its seven tabs are light forms and tables. So the split happens at the
 * SUB-TAB, not the route: this file is a boundary and nothing else, and `UsageDashboard` is the only
 * file under `WhatsAppBot/` allowed to import `@carbon/charts`. One stray top-level chart import in
 * any sibling tab silently undoes the split without breaking anything visible.
 */
const UsageDashboard = lazy(() => import("./UsageDashboard"));

export const UsageTab: React.FC = () => (
  <Suspense
    fallback={
      // Sized to the dashboard it replaces — a KPI row and a wide chart — so the page does not
      // collapse to one line and then jump when the chunk lands.
      <div className="pt-4 space-y-6">
        <SkeletonText paragraph lineCount={2} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map(index => (
            <SkeletonPlaceholder key={index} className="!w-full !h-[104px]" />
          ))}
        </div>
        <SkeletonPlaceholder className="!w-full !h-[300px]" />
      </div>
    }
  >
    <UsageDashboard />
  </Suspense>
);
