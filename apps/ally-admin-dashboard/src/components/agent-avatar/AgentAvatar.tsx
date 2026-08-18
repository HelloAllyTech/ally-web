import { FC, useId } from "react";

/**
 * Bug Hunter's face.
 *
 * Deliberately an abstract figure rather than a portrait: this is the only
 * agent on the platform presented as a colleague, and giving it a skin tone,
 * a gender or an age would be inventing facts about a piece of software that
 * a real teammate would then be compared against. A silhouette with a
 * magnifier reads as "a person who looks for things" without claiming to be
 * any particular person.
 *
 * Drawn flat, in the brand ramp, at a size that still resolves at 20px —
 * the collapsed sidebar renders this as the Bug Hunter tab's icon, so the
 * silhouette has to survive being shrunk to a glyph.
 *
 * Lives in `components/` rather than in the Bug Hunter page folder because
 * the sidebar uses it too, and a page importing into the chrome (or the
 * chrome importing out of a page) is the wrong direction.
 */

/** Presence, in the Slack sense: the dot on the corner of the avatar. */
export type AgentPresence = "off_duty" | "waiting_on_you" | "problem" | "working" | "on_shift";

const PRESENCE_COLORS: Record<AgentPresence, string> = {
  off_duty: "bg-neutral-400",
  waiting_on_you: "bg-orange-500",
  problem: "bg-destructive-500",
  working: "bg-amber-500",
  on_shift: "bg-green-500",
};

const SIZES = {
  xs: { box: 20, dot: "h-1.5 w-1.5" },
  sm: { box: 28, dot: "h-2 w-2" },
  md: { box: 40, dot: "h-2.5 w-2.5" },
  lg: { box: 56, dot: "h-3.5 w-3.5" },
} as const;

export interface AgentAvatarProps {
  size?: keyof typeof SIZES;
  /** Omit for a plain avatar — the sidebar's collapsed icon, a message row. */
  presence?: AgentPresence;
  /** Ring-pulses while `presence` is "working", so a live run is visible without reading. */
  animate?: boolean;
  /** Falls back to a generic description; pass the character's name where it's known. */
  label?: string;
}

export const AgentAvatar: FC<AgentAvatarProps> = ({
  size = "md",
  presence,
  animate = false,
  label,
}) => {
  const { box, dot } = SIZES[size];
  // Several avatars share a page (profile card, sidebar, one per message), and
  // duplicate SVG ids across them would make the clip path ambiguous.
  const clipId = `agent-avatar-disc-${useId()}`;

  return (
    <span className="relative inline-flex shrink-0" style={{ width: box, height: box }}>
      <svg
        width={box}
        height={box}
        viewBox="0 0 48 48"
        role="img"
        aria-label={label ?? "Agent avatar"}
        focusable="false"
      >
        <circle cx="24" cy="24" r="24" fill="#EBF0FA" />
        {/* Clipped to the disc so the shoulders meet its edge cleanly at every size. */}
        <defs>
          <clipPath id={clipId}>
            <circle cx="24" cy="24" r="24" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <circle cx="22" cy="18.5" r="7.5" fill="#264D8E" />
          <path d="M22 28.5c8.3 0 15 6 15 13.5v6H7v-6c0-7.5 6.7-13.5 15-13.5z" fill="#264D8E" />
        </g>
        {/* The magnifier: what makes this a bug hunter rather than any avatar. */}
        <circle cx="33" cy="30" r="8.5" fill="#FFFFFF" stroke="#1F3F75" strokeWidth="2.5" />
        <path d="M39.2 36.2 43.5 40.5" stroke="#1F3F75" strokeWidth="3" strokeLinecap="round" />
        {/* A bug in the lens. Body plus two legs a side — any more detail turns
            to mud once this is drawn at 20px in the sidebar. */}
        <ellipse cx="33" cy="30" rx="2.6" ry="3.4" fill="#264D8E" />
        <path
          d="M30.4 27.6 28.6 26.2M30.4 32.4 28.6 33.8M35.6 27.6 37.4 26.2M35.6 32.4 37.4 33.8"
          stroke="#264D8E"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>

      {presence && (
        <span className="absolute -bottom-0.5 -right-0.5 flex">
          {animate && presence === "working" && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping motion-reduce:animate-none ${PRESENCE_COLORS[presence]}`}
            />
          )}
          {/* A slower, softer pulse for "on shift, nothing outstanding" —
              distinct from the fast working ping so the two presences read
              as different rhythms rather than the same animation recoloured. */}
          {animate && presence === "on_shift" && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-breathe motion-reduce:animate-none ${PRESENCE_COLORS[presence]}`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full ring-2 ring-white ${dot} ${PRESENCE_COLORS[presence]}`}
          />
        </span>
      )}
    </span>
  );
};
