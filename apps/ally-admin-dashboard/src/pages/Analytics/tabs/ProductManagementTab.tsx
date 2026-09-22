import { RoadmapDeliveryCard } from "../RoadmapDeliveryCard";

/**
 * Analytics → Product management: how the internal product roadmap is actually
 * being delivered.
 *
 * Distinct from every other tab on this page in what it reads. The rest measure
 * the PRODUCT — learners, sessions, latency, cost — from tenant-scoped tables.
 * This one measures OUR OWN delivery: the vote-based board in
 * `src/product-roadmap`, which carries no tenant. Keeping it on its own tab
 * rather than adding a panel to Highlights is what stops a reader taking
 * "180 votes shipped" as a platform metric.
 *
 * The "Changed lines shipped per week, by repo" chart that used to sit here as
 * the output counterpart moved to Highlights → Goals (`ShipVolumeCard`,
 * mounted in `GoalsTab.tsx`), alongside the platform's other pace-of-the-
 * business charts — see that tab for the votes-vs-code framing this one no
 * longer needs to carry alone.
 *
 * No page-level pickers (`uses: { language: false, range: false }`): the
 * roadmap chart has no language dimension and is all-time by construction. A
 * range picker at the top of the page would imply a scoping that does not
 * happen.
 */
export const ProductManagementTab = () => (
  <div className="flex flex-col gap-4">
    <RoadmapDeliveryCard />
  </div>
);
