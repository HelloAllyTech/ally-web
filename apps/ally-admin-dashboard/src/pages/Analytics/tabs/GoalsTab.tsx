import { ActiveUsersXpCard } from "../ActiveUsersXpCard";
import { BugHunterVolumeCard } from "../BugHunterVolumeCard";
import { GoalsXpCard } from "../GoalsXpCard";
import { ShipVolumeCard } from "../ShipVolumeCard";
import { XpByTenantCard } from "../XpByTenantCard";
import { XpLevelReachedCard } from "../XpLevelReachedCard";

/**
 * Highlights → Goals: "are we on pace" — leadership's pace-of-the-business
 * charts in one place, ahead of the broader platform-history view in the
 * other Highlights sub-tabs.
 *
 * No page-level pickers: every card owns its own window/grain control
 * (`GoalsXpCard`'s month/quarter/year, the four charts below it their own
 * day/week/month[/quarter]/year, `ShipVolumeCard` its own weeks window), so a
 * shared page control would either be redundant or wrong for at least one
 * card on the tab.
 *
 * Order follows the product brief this tab was built from: XP vs. goal (the
 * original chart) first, then active learners, level attainment, code
 * shipped, Bug Hunter volume, and XP by tenant last. `ShipVolumeCard` is
 * relocated here from the Product Management tab (its own doc comment
 * explains why); `ActiveUsersXpCard`/`XpLevelReachedCard`/
 * `BugHunterVolumeCard`/`XpByTenantCard` are new, purpose-built for this brief
 * rather than adapted from an existing chart — see each card's own doc
 * comment for why the existing "active users" and "levels" charts elsewhere
 * on Highlights don't answer the same question.
 */
export const GoalsTab = () => (
  <div className="flex flex-col gap-4">
    <GoalsXpCard />
    <ActiveUsersXpCard />
    <XpLevelReachedCard />
    <ShipVolumeCard />
    <BugHunterVolumeCard />
    <XpByTenantCard />
  </div>
);
