import { GoalsXpCard } from "../GoalsXpCard";
import { RoleplayMinutesCard } from "../RoleplayMinutesCard";
import { RoleplayQualityCard } from "../RoleplayQualityCard";
import { RoleplaySentimentCard } from "../RoleplaySentimentCard";
import { RoleplayVoiceLatencyCard } from "../RoleplayVoiceLatencyCard";

/**
 * Highlights → Goals: five cards on the leadership question "are we on pace".
 *
 * First sub-tab in the Highlights registry, ahead of the broader
 * platform-history view in the other sub-tabs. No page-level pickers: every
 * card here is all-time and platform-wide by construction (Goals has no
 * tenant/range filter bar at all), and each card's own grain — and, for the
 * four relocated/new cards below, its own window — lives on the card.
 *
 * `GoalsXpCard` is the original occupant. The other four are relocations (or,
 * for Roleplay quality, new) off other Highlights sub-tabs / Latency &
 * reliability, so the same finding reads in one place instead of requiring a
 * reader to piece it together from three tabs — see each card's own doc for
 * exactly where it came from and what, if anything, was left behind:
 *  - `RoleplayMinutesCard` — was Platform's "Practice minutes".
 *  - `RoleplayVoiceLatencyCard` — was Latency & reliability's "Time to first
 *    voice — live pipeline"; its 3 companion diagnostic charts stayed there.
 *  - `RoleplayQualityCard` — new: the Roleplay Quality Index composite only.
 *    The 4-dimension breakdown stays on Quality & sentiment's own untouched
 *    "Roleplay quality" combo chart — this is a second, simpler view of the
 *    same number, not a duplicate bug (see the card's caption).
 *  - `RoleplaySentimentCard` — was Quality & sentiment's "Learner sentiment
 *    (proxy NPS)", relabelled.
 *
 * Each relocated card lost the page-level filter its old tab offered (a
 * tenant filter for Practice minutes, a language filter for voice latency) —
 * Goals has no page-level filters to inherit, so all four read platform-wide,
 * every language, matching `GoalsXpCard`'s existing construction.
 */
export const GoalsTab = () => (
  <div className="flex flex-col gap-4">
    <GoalsXpCard />
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <RoleplayMinutesCard />
      <RoleplayVoiceLatencyCard />
      <RoleplayQualityCard />
      <RoleplaySentimentCard />
    </div>
  </div>
);
