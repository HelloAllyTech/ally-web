import { useNavigate } from "react-router-dom";

import { useLazyGetNextTrackItemQuery } from "@api";
import { buildTrackItemRoute, buildTrackRoute } from "@constants";
import { ACTIVE_TRACK_CONTEXT_KEY, ActiveTrackContext } from "@types";

/**
 * Advances a track-launched roleplay/case session back into the track: looks
 * up the next unlocked item and navigates there, or back to the track
 * overview once the track is complete.
 */
export const useContinueTrack = (trackContext: ActiveTrackContext | null) => {
  const navigate = useNavigate();
  const [getNextTrackItem] = useLazyGetNextTrackItemQuery();

  return async () => {
    if (!trackContext) return;
    try {
      const result = await getNextTrackItem({ trackId: trackContext.trackId }).unwrap();
      sessionStorage.removeItem(ACTIVE_TRACK_CONTEXT_KEY);
      if (result.trackCompleted || !result.nextItem) {
        navigate(buildTrackRoute(trackContext.trackId));
      } else {
        navigate(buildTrackItemRoute(trackContext.trackId, result.nextItem.id));
      }
    } catch {
      sessionStorage.removeItem(ACTIVE_TRACK_CONTEXT_KEY);
      navigate(buildTrackRoute(trackContext.trackId));
    }
  };
};
