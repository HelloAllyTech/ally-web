"use client";

import { FC } from "react";

import { VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

/**
 * EXPERIMENTAL. The AI actor's video, overlaid on its call card.
 *
 * ## Why this is a separate component and not a branch inside SimulationInterface
 *
 * `useTracks` opens a subscription to the room's track events and re-renders on
 * every one of them. A hook cannot be called conditionally, so putting it in
 * SimulationInterface would run it for every session in the product to serve an
 * opt-in experiment that almost none of them have turned on. Mounting this
 * component only when `videoActorEnabled` is true keeps that cost — and any bug
 * in it — inside the sessions that asked for it.
 *
 * ## Why it overlays rather than replaces
 *
 * It renders `null` until a remote camera track actually exists, and the caller
 * layers it *over* the existing UserCallCard rather than swapping the card out.
 * So the three states fall out of one condition with no extra plumbing:
 *
 * * roleplay opted out            -> not mounted, card as today
 * * opted in, no track (yet, or the agent's own kill-switch is off, or the
 *   avatar failed to start and the session degraded to audio-only) -> card
 * * opted in, track publishing    -> video over the card
 *
 * The middle one is the one that matters. The agent falls back to an audio-only
 * session on any avatar failure and tells the client nothing, because there is
 * nothing the learner should do about it — so "no track" must be an ordinary
 * resting state here, never an error or a spinner. A learner who never knew a
 * face was coming should not be shown its absence mid-conversation.
 */
export const ActorVideo: FC = () => {
  // `onlySubscribed` so a placeholder for an announced-but-not-yet-flowing
  // track cannot paint a black rectangle over the card.
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const actorTrack = tracks.find(ref => !ref.participant.isLocal && ref.publication?.track);

  if (!actorTrack) return null;

  return (
    <div
      data-testid="simulation-actor-video"
      className="absolute inset-0 z-10 overflow-hidden rounded-2xl bg-black"
    >
      <VideoTrack trackRef={actorTrack} className="w-full h-full object-cover" />
    </div>
  );
};
