import React, { useEffect, useRef, useState } from "react";

import { RemoteParticipant, Room, RoomEvent } from "livekit-client";

import { ArrowDown } from "@assets";
import { en } from "@constants";
import { RoleplayDirectorTurnPayload } from "@src/types/roleplayStudio";
import { decodeUint8ToJson } from "@utils";

/** LiveKit data-channel topic carrying director turn payloads. */
export const DIRECTOR_TOPIC = "director";

interface DirectorObserverPanelProps {
  room: Room | null;
}

const TurnCard: React.FC<{ turn: RoleplayDirectorTurnPayload }> = ({ turn }) => {
  const strings = en.roleplayStudio.preview;
  const observed = (turn.behaviors ?? []).filter(behavior => behavior.observed);
  const stateChanged = turn.state && turn.state.from !== turn.state.to;

  return (
    <div
      className={`rounded-md border bg-white p-2.5 ${turn.stale ? "opacity-60" : ""} border-border-light`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-typography-900">
          {strings.turn} {turn.turn}
        </span>
        <div className="flex items-center gap-1.5">
          {turn.stale && (
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-typography-600">
              {strings.stale}
            </span>
          )}
          {typeof turn.score === "number" && (
            <span className="rounded-full bg-secondary-50 px-1.5 py-0.5 text-[10px] text-typography-900">
              {strings.score}: {turn.score}
            </span>
          )}
        </div>
      </div>

      {turn.state && (
        <p
          className={`mt-1 text-xs ${stateChanged ? "font-medium text-primary-500" : "text-typography-700"}`}
        >
          {strings.stateChange}: {turn.state.from}
          {" → "}
          {turn.state.to}
        </p>
      )}

      {observed.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {observed.map(behavior => (
            <span
              key={behavior.id}
              className="rounded-full bg-success-100 px-1.5 py-0.5 text-[10px] text-typography-900"
            >
              {behavior.id}
            </span>
          ))}
        </div>
      )}

      {(turn.unlocks?.length ?? 0) > 0 && (
        <p className="mt-1.5 text-xs text-typography-800">
          {strings.unlocks}: {turn.unlocks.map(unlock => unlock.topic || unlock.id).join(", ")}
        </p>
      )}

      {turn.feedback && (
        <p className="mt-1.5 text-xs italic text-typography-700">{turn.feedback}</p>
      )}
    </div>
  );
};

/**
 * Floating observer feed for the live preview: renders `director.turn`
 * payloads arriving on the LiveKit data channel (topic "director") — live
 * state transitions, observed behaviors, unlocks, scores, and feedback.
 */
export const DirectorObserverPanel: React.FC<DirectorObserverPanelProps> = ({ room }) => {
  const strings = en.roleplayStudio.preview;
  const [turns, setTurns] = useState<RoleplayDirectorTurnPayload[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!room) return undefined;

    const handleData = (
      payload: Uint8Array,
      _participant?: RemoteParticipant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic !== DIRECTOR_TOPIC) return;
      try {
        const data = decodeUint8ToJson(payload) as RoleplayDirectorTurnPayload;
        if (data?.type === "director.turn") {
          setTurns(previous => [...previous, data]);
        }
      } catch {
        // Non-JSON payloads on the topic are ignored.
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  useEffect(() => {
    const node = feedRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [turns]);

  return (
    <div className="fixed right-4 top-4 z-40 w-[320px] max-h-[calc(100vh-2rem)] flex flex-col rounded-lg border border-border-light bg-white/95 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => setCollapsed(previous => !previous)}
        className="flex items-center justify-between px-3 py-2.5"
      >
        <span className="text-sm font-medium text-typography-900">{strings.directorFeed}</span>
        <span className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}>
          <ArrowDown />
        </span>
      </button>

      {!collapsed && (
        <div
          ref={feedRef}
          className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3"
          data-testid="director-feed"
        >
          {turns.length === 0 ? (
            <p className="py-4 text-center text-xs text-typography-600">{strings.waiting}</p>
          ) : (
            turns.map((turn, index) => <TurnCard key={`turn-${turn.turn}-${index}`} turn={turn} />)
          )}
        </div>
      )}
    </div>
  );
};
