import { RoadmapDeliveryCard } from "../RoadmapDeliveryCard";

/**
 * Analytics → Product management: how the internal product roadmap is actually
 * being delivered.
 *
 * Distinct from every other tab on this page in what it reads. The rest measure
 * the PRODUCT — learners, sessions, latency, cost — from tenant-scoped tables.
 * This one measures OUR OWN backlog: the coin-voting board in
 * `src/product-roadmap`, which carries no tenant and no window. Keeping it on its
 * own tab rather than adding a panel to Highlights is what stops a reader taking
 * "180 coins shipped" as a platform metric.
 *
 * No page-level pickers (`uses: { language: false, range: false }`): the roadmap
 * has no language dimension, and its charts are all-time by construction — a
 * range picker at the top of the page would imply a scoping that does not happen.
 */
export const ProductManagementTab = () => (
  <div className="flex flex-col gap-4">
    <RoadmapDeliveryCard />
  </div>
);
