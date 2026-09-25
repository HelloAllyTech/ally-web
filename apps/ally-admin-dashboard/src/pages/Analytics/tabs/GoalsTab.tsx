import { ActivationFunnelCard } from "../ActivationFunnelCard";
import { ActiveUsersXpCard } from "../ActiveUsersXpCard";
import { AverageRatingCard } from "../AverageRatingCard";
import { BugHunterVolumeCard } from "../BugHunterVolumeCard";
import { ScrollNoteContext } from "../chartKit";
import { CumulativeUsersCard } from "../CumulativeUsersCard";
import { GoalsXpCard } from "../GoalsXpCard";
import { NewUsersCard } from "../NewUsersCard";
import { NewVsReturningUsersCard } from "../NewVsReturningUsersCard";
import { PlayTimeCard } from "../PlayTimeCard";
import { RoleplayMinutesCard } from "../RoleplayMinutesCard";
import { RoleplayQualityCard } from "../RoleplayQualityCard";
import { RoleplaySessionCostCard } from "../RoleplaySessionCostCard";
import { RoleplayVoiceLatencyCard } from "../RoleplayVoiceLatencyCard";
import { SatisfactionMixCard } from "../SatisfactionMixCard";
import { ShipVolumeCard } from "../ShipVolumeCard";
import { XpByTenantCard } from "../XpByTenantCard";
import { XpLevelReachedCard } from "../XpLevelReachedCard";

/**
 * Highlights → Goals: leadership's "are we on pace" charts in one place,
 * ahead of the broader platform-history view in the other Highlights
 * sub-tabs.
 *
 * No page-level pickers: every card owns its own window/grain control
 * (`GoalsXpCard`'s month/quarter/year, the roleplay charts' own
 * day/week/month[/quarter]/year[/all-time], `ShipVolumeCard`'s own weeks
 * window), so a shared page control would either be redundant or wrong for
 * at least one card on the tab.
 *
 * `GoalsXpCard` is the original occupant, first on the page. Everything below
 * it landed here from two independent efforts and is either a relocation off
 * another Highlights sub-tab / Latency & reliability, or new-built for this
 * tab — see each card's own doc for exactly where it came from and what, if
 * anything, was left behind:
 *  - `RoleplayMinutesCard` — was Platform's "Practice minutes".
 *  - `RoleplayVoiceLatencyCard` — was Latency & reliability's "Time to first
 *    voice — live pipeline"; its 3 companion diagnostic charts stayed there.
 *  - `RoleplayQualityCard` — new: the Roleplay Quality Index composite only.
 *    The 4-dimension breakdown stays on Quality & sentiment's own untouched
 *    "Roleplay quality" combo chart — this is a second, simpler view of the
 *    same number, not a duplicate bug (see the card's caption).
 *  - `SatisfactionMixCard` — Quality & sentiment's "Satisfaction mix" (the
 *    1–2 / 3 / 4–5 rating breakdown), in the slot the proxy-NPS line used to
 *    hold; the Quality & sentiment copy stays where it is.
 *  - `AverageRatingCard` — the mean post-session rating per period (AAQ-156),
 *    off the same `quality-distribution` ratings as the Satisfaction Mix, each
 *    point labelled with the number of ratings it averages.
 *  - `ActiveUsersXpCard`, `XpLevelReachedCard`, `BugHunterVolumeCard`,
 *    `XpByTenantCard` — new, purpose-built for this tab's brief rather than
 *    adapted from an existing chart — see each card's own doc comment for why
 *    the existing "active users" and "levels" charts elsewhere on Highlights
 *    don't answer the same question.
 *  - `ShipVolumeCard` — relocated here from the Product management tab (its
 *    own doc comment explains why).
 *  - `NewUsersCard` (AAQ-018), `CumulativeUsersCard` (AAQ-019),
 *    `NewVsReturningUsersCard` (AAQ-020), `PlayTimeCard` (AAQ-026) — were
 *    Platform's growth and play-time charts; `ActivationFunnelCard` (AAQ-035)
 *    was Usage levels' activation funnel. Moved, not copied: each now lives
 *    only here.
 *  - `RoleplaySessionCostCard` — new (AAQ-157): AI cost per minute of roleplay,
 *    costed per SESSION and stacked by component. Not the Unit economics
 *    cost-per-10-minutes chart, which buckets each call by when it ran.
 *
 * Each relocated card lost the page-level filter its old tab offered (a
 * tenant filter for Practice minutes, a language filter for voice latency) —
 * Goals has no page-level filters to inherit, so all read platform-wide,
 * every language, matching `GoalsXpCard`'s existing construction.
 */
export const GoalsTab = () => (
  // One chart per row at every screen size — a single column, never two cards
  // side by side — so each chart gets the full width to breathe. No "scroll
  // sideways" caption under a wide plot here: Priority keeps each card to the plot.
  <ScrollNoteContext.Provider value={false}>
    <div className="flex flex-col gap-4">
      <GoalsXpCard />
      <RoleplayMinutesCard />
      <RoleplayVoiceLatencyCard />
      <RoleplayQualityCard />
      <SatisfactionMixCard />
      <AverageRatingCard />
      <ActiveUsersXpCard />
      <XpLevelReachedCard />
      <ShipVolumeCard />
      <BugHunterVolumeCard />
      <XpByTenantCard />
      <NewUsersCard />
      <CumulativeUsersCard />
      <NewVsReturningUsersCard />
      <PlayTimeCard />
      <ActivationFunnelCard />
      <RoleplaySessionCostCard />
    </div>
  </ScrollNoteContext.Provider>
);
