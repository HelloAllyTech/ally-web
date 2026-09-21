import React, { useEffect, useMemo, useRef, useState } from "react";

import { RemoteParticipant, Room, RoomEvent } from "livekit-client";

import { en } from "@constants";
import { InternalMonologueTurn, MONOLOGUE_TOPIC } from "@src/types/internalMonologue";
import { decodeUint8ToJson } from "@utils";

/**
 * Two homes, two palettes.
 *
 * The live panel sits beside the simulation, which is near-black (`#171A1A`,
 * see SimulationPage) — a white card next to it reads as a different
 * application bolted on. The recorded-runs modal sits in the admin console,
 * which is light. Same component either way; only the surface changes.
 */
export type MonologueTone = "light" | "dark";

interface ToneClasses {
  panel: string;
  title: string;
  subtitle: string;
  card: string;
  cardMissed: string;
  turnLabel: string;
  meta: string;
  quoteBorder: string;
  speaker: string;
  quote: string;
  body: string;
  divider: string;
  mono: string;
  action: string;
}

const TONES: Record<MonologueTone, ToneClasses> = {
  light: {
    panel: "border-border-light bg-white/95",
    title: "text-typography-900",
    subtitle: "text-typography-600",
    card: "border-border-light bg-white",
    cardMissed: "border-warning-300 bg-warning-50",
    turnLabel: "text-typography-900",
    meta: "text-typography-600",
    quoteBorder: "border-border-light",
    speaker: "text-typography-600",
    quote: "text-typography-700",
    body: "text-typography-800",
    divider: "border-border-light",
    mono: "text-typography-800",
    action: "text-typography-600 hover:text-typography-900",
  },
  // Straight from the simulation's own palette so the two panes read as one
  // screen: #1D2020 surface, #282B31 lines, #D9D9DC / #9CA3AF type.
  dark: {
    panel: "border-[#282B31] bg-[#1D2020]",
    title: "text-[#D9D9DC]",
    subtitle: "text-[#9CA3AF]",
    card: "border-[#282B31] bg-[#171A1A]",
    cardMissed: "border-[#E77625] bg-[#282B31]",
    turnLabel: "text-[#D9D9DC]",
    meta: "text-[#9CA3AF]",
    quoteBorder: "border-[#3D4045]",
    speaker: "text-[#9CA3AF]",
    quote: "text-[#B6B5B9]",
    body: "text-[#D9D9DC]",
    divider: "border-[#282B31]",
    mono: "text-[#B6B5B9]",
    action: "text-[#9CA3AF] hover:text-[#D9D9DC]",
  },
};

interface InternalMonologuePanelProps {
  /** Live source: subscribe to monologue packets on this room. */
  room?: Room | null;
  /** Stored source: render a completed session's turns. Wins over `room`. */
  turns?: InternalMonologueTurn[];
  /** Layout only — lets a container stretch the panel to fill it. */
  className?: string;
  /** Surface palette. Defaults to the admin console's light one. */
  tone?: MonologueTone;
  /** When given, the header offers to hide the panel. */
  onHide?: () => void;
  /**
   * Drop the panel's own border, background and header. For when it already
   * sits inside a titled container — a sidebar tab labelled "Internal
   * monologue" does not need a card of the same name inside it.
   */
  hideChrome?: boolean;
}

/**
 * Compose one turn into plain sentences.
 *
 * Prose rather than key/value chips because the reader is trying to understand
 * a mind, and a labelled grid makes them assemble the story themselves. The
 * strings live in `en.ts` so wording can change without touching this file.
 */
const narrate = (turn: InternalMonologueTurn): string[] => {
  const t = en.internalMonologue;
  const lines: string[] = [];

  if (turn.missed) lines.push(t.staleTurn);

  if (turn.stanceFrom && turn.stanceTo) {
    lines.push(t.moved(turn.stanceFrom, turn.stanceTo));
  } else if (turn.stanceTo) {
    lines.push(
      turn.turnsInStance > 1
        ? t.heldFor(turn.stanceTo, turn.turnsInStance)
        : t.nowAt(turn.stanceTo),
    );
  }

  if (turn.events.length) {
    lines.push(
      t.credited(
        turn.events
          .map(e =>
            e.score == null ? e.label : `${e.label} (${e.score > 0 ? "+" : ""}${e.score})`,
          )
          .join("; "),
      ),
    );
  }

  if (turn.affect) lines.push(t.feels(turn.affect));
  // The private read. Quoted, because it is the client's own reasoning about
  // the counsellor rather than an observation about the client.
  if (turn.appraisal) lines.push(t.privately(turn.appraisal));
  if (turn.register) lines.push(t.speaking(turn.register));

  if (turn.disclosed.length) lines.push(t.justSaid(turn.disclosed.join("; ")));
  if (turn.withheld.length) {
    lines.push(
      t.notSaying(
        turn.withheld
          .map(w => (w.deflection ? `${w.topic} — ${w.deflection}` : w.topic))
          .join("; "),
      ),
    );
  }
  if (turn.threadsOpened.length) lines.push(t.leftHanging(turn.threadsOpened.join("; ")));
  if (turn.threadsClosed.length) lines.push(t.finished(turn.threadsClosed.join("; ")));

  if (turn.recalled.length) lines.push(t.onMind(turn.recalled.join("; ")));
  if (turn.retrieveCues.length) lines.push(t.willLookFor(turn.retrieveCues.join(", ")));

  return lines;
};

const TurnCard: React.FC<{
  turn: InternalMonologueTurn;
  previousScore: number | null;
  tone: ToneClasses;
}> = ({ turn, previousScore, tone }) => {
  const t = en.internalMonologue;
  const lines = narrate(turn);
  const sectionKeys = Object.keys(turn.sections ?? {});
  // Show the score only when it MOVED. Repeating "score 58" on three
  // consecutive cards reads as though something happened each turn, which is
  // the opposite of what a curator needs to see.
  const delta = turn.score != null && previousScore != null ? turn.score - previousScore : null;
  const showScore = turn.score != null && (previousScore == null || delta !== 0);

  return (
    <article
      className={`rounded-md border p-3 ${turn.missed ? tone.cardMissed : tone.card}`}
      data-testid={`monologue-turn-${turn.turn}`}
    >
      <header className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className={`text-xs font-medium ${tone.turnLabel}`}>
          {t.turn} {turn.turn}
        </span>
        {showScore && (
          <span className={`text-[11px] ${tone.meta}`}>
            {t.score} {turn.score}
            {delta != null && delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}
          </span>
        )}
      </header>

      {/* What was actually said. First, because everything below is a
          consequence of it — and a stored record read a week later has no
          other anchor. */}
      {(turn.counsellorSaid || turn.clientSaid) && (
        <div className={`mb-2 border-l-2 pl-2 ${tone.quoteBorder}`}>
          {turn.counsellorSaid && (
            <p className={`mb-0.5 text-xs ${tone.quote}`}>
              <span className={tone.speaker}>{t.counsellor}: </span>
              {turn.counsellorSaid}
            </p>
          )}
          {turn.clientSaid && (
            <p className={`text-xs ${tone.quote}`}>
              <span className={tone.speaker}>{t.client}: </span>
              {turn.clientSaid}
            </p>
          )}
        </div>
      )}

      {lines.map((line, i) => (
        <p key={i} className={`mb-1 text-xs leading-relaxed ${tone.body}`}>
          {line}
        </p>
      ))}

      {/* The prompt text itself. Always visible: this is the artifact being
          tuned, and hiding it behind a click is the thing that makes a
          diagnostic panel go unread. */}
      {sectionKeys.length > 0 && (
        <div className={`mt-2 border-t pt-2 ${tone.divider}`}>
          <p className={`mb-1 text-[11px] font-medium uppercase tracking-wide ${tone.meta}`}>
            {t.sentToActor}
          </p>
          {sectionKeys.map(key => (
            <div key={key} className="leading-snug">
              <span className={`text-[11px] ${tone.meta}`}>{key}: </span>
              <span
                className={`whitespace-pre-wrap font-mono text-[11px] leading-snug ${tone.mono}`}
              >
                {turn.sections[key]}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};

/**
 * The client's internal monologue, turn by turn.
 *
 * Two sources, one shape: live LiveKit packets during a preview, or a stored
 * array when revisiting a finished session. Everything is visible — no
 * collapsing — because the reader is unravelling behaviour, not being
 * reassured, and every click is a thing they have to think to do.
 */
export const InternalMonologuePanel: React.FC<InternalMonologuePanelProps> = ({
  room,
  turns: storedTurns,
  className = "",
  tone = "light",
  onHide,
  hideChrome = false,
}) => {
  const t = en.internalMonologue;
  const c = TONES[tone];
  const [liveTurns, setLiveTurns] = useState<InternalMonologueTurn[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  // Auto-scroll only while the reader is already at the bottom. Yanking the
  // view mid-read is how a live feed becomes unusable during a session.
  const pinnedRef = useRef(true);

  const isStored = Array.isArray(storedTurns);
  const turns = useMemo(
    () => (isStored ? (storedTurns as InternalMonologueTurn[]) : liveTurns),
    [isStored, storedTurns, liveTurns],
  );

  useEffect(() => {
    // `useLiveKitRoom` types its room as `any` and hands one back before it is
    // fully constructed, so a duck-type check is the honest guard here: this
    // panel is an authoring aid and must never be able to break a live
    // preview by assuming a shape it did not verify.
    const canSubscribe = !!room && typeof room.on === "function" && typeof room.off === "function";
    if (isStored || !canSubscribe) return undefined;

    const handleData = (
      payload: Uint8Array,
      _participant?: RemoteParticipant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic !== MONOLOGUE_TOPIC) return;
      try {
        const data = decodeUint8ToJson(payload) as InternalMonologueTurn;
        if (data?.type !== "monologue.turn") return;
        setLiveTurns(previous => {
          // A retried publish can repeat a turn; last write wins so a late
          // payload corrects rather than duplicates.
          const next = previous.filter(p => p.turn !== data.turn);
          return [...next, data].sort((a, b) => a.turn - b.turn);
        });
      } catch {
        // Non-JSON payloads on the topic are not ours.
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, isStored]);

  useEffect(() => {
    // Live: follow the conversation. Stored: don't — a recorded run is read
    // from turn 1 forward, and opening it at the last turn hides the beginning
    // of the very story the reader came for.
    if (isStored) return;
    const node = feedRef.current;
    if (node && pinnedRef.current) node.scrollTop = node.scrollHeight;
  }, [turns, isStored]);

  const handleScroll = () => {
    const node = feedRef.current;
    if (!node) return;
    pinnedRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
  };

  return (
    <section
      className={`flex min-h-0 flex-col ${
        hideChrome ? "" : `rounded-lg border ${c.panel}`
      } ${className}`}
      aria-label={t.title}
    >
      {!hideChrome && (
        <header className="flex items-start justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0">
            <h2 className={`text-sm font-medium ${c.title}`}>{t.title}</h2>
            <p className={`text-[11px] ${c.subtitle}`}>{t.subtitle}</p>
          </div>
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className={`shrink-0 text-[11px] ${c.action}`}
              aria-label={t.hide}
            >
              {t.hide}
            </button>
          )}
        </header>
      )}

      <div
        ref={feedRef}
        onScroll={handleScroll}
        className={`custom-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto ${
          hideChrome ? "" : "px-3 pb-3"
        }`}
        data-testid="monologue-feed"
      >
        {turns.length === 0 ? (
          <p className={`py-6 text-center text-xs ${c.subtitle}`}>
            {isStored ? t.emptyStored : t.waiting}
          </p>
        ) : (
          turns.map((turn, i) => (
            <TurnCard
              key={turn.turn}
              turn={turn}
              previousScore={i > 0 ? turns[i - 1].score : null}
              tone={c}
            />
          ))
        )}
      </div>
    </section>
  );
};
