import { RoadmapDeliveryCard } from "../RoadmapDeliveryCard";
import { ShipVolumeCard } from "../ShipVolumeCard";

/**
 * Analytics → Product management: how the internal product roadmap is actually
 * being delivered.
 *
 * Distinct from every other tab on this page in what it reads. The rest measure
 * the PRODUCT — learners, sessions, latency, cost — from tenant-scoped tables.
 * This one measures OUR OWN delivery: the vote-based board in
 * `src/product-roadmap` and the repos themselves, neither of which carries a
 * tenant. Keeping it on its own tab rather than adding a panel to Highlights is
 * what stops a reader taking "180 votes shipped" as a platform metric.
 *
 * **Order is the argument.** The outcome measure comes first — votes of demand
 * satisfied — and the output measure second, because churn is the easier number
 * to move and the one most likely to be mistaken for progress. A reader who
 * meets "how much code did we write" before "did we ship what was wanted" has
 * been handed the wrong question first.
 *
 * No page-level pickers (`uses: { language: false, range: false }`): neither
 * card has a language dimension, the roadmap chart is all-time by construction,
 * and the volume chart's window is a property of that chart (a weekly axis has a
 * readable width). A range picker at the top of the page would imply a scoping
 * that does not happen.
 */
export const ProductManagementTab = () => (
  <div className="flex flex-col gap-4">
    <RoadmapDeliveryCard />
    <ShipVolumeCard />
  </div>
);
