import { FC, useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { useRecordGameResultMutation } from "@api";
import { StartGameItemPayload, TrackItemCompletionResult, TrackGameKey } from "@types";

interface GameItemPlayerProps {
  payload: StartGameItemPayload;
  itemId: string;
  onCompleted: (result: TrackItemCompletionResult) => void;
}

/** A game bundle is a static page served from the app's own public dir. */
const gameUrl = (key: TrackGameKey) => `/games/${key.toLowerCase()}/index.html`;

/** Messages a game bundle posts to us. Mirrors the bridge in each bundle. */
interface GameMessage {
  source: "ally-game";
  game: TrackGameKey;
  type: "ready" | "started" | "over";
  score?: number;
  highScore?: number;
}

/**
 * Game item: hosts a self-contained game bundle in a sandboxed iframe.
 *
 * The iframe is the whole design. These bundles are third-party arcade code
 * with their own global state, document-level key handlers and stylesheets;
 * an iframe means none of that can reach the course player, and swallowing
 * Space and the arrow keys inside the frame is exactly what we want anyway.
 *
 * Nothing here gates anything. The item was completed server-side when it was
 * opened, so this reports that completion on mount — Next is live before the
 * learner has touched the game, and a score is only ever a personal best.
 */
export const GameItemPlayer: FC<GameItemPlayerProps> = ({ payload, itemId, onCompleted }) => {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [bestScore, setBestScore] = useState<number | null>(payload.bestScore);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [recordGameResult] = useRecordGameResultMutation();

  // The server already completed this item; tell the player so Next unlocks.
  const completion = payload.completion;
  useEffect(() => {
    onCompleted(completion);
  }, [completion, onCompleted]);

  const handleRunFinished = useCallback(
    (score: number) => {
      setLastScore(score);
      setBestScore(prev => (prev == null || score > prev ? score : prev));
      // Fire-and-forget: a lost personal best is not worth a error toast in
      // the middle of a break, and nothing downstream depends on it.
      recordGameResult({ itemId, score })
        .unwrap()
        .catch(() => undefined);
    },
    [itemId, recordGameResult],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      /**
       * The frame is sandboxed without allow-same-origin, so its origin is
       * opaque ("null") and an origin equality check would reject every
       * message. Identity comes from the source window instead: that is the
       * exact frame this component created, which no other page can forge.
       */
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as GameMessage | undefined;
      if (!data || data.source !== "ally-game") return;

      if (data.type === "ready") {
        // '*' because the frame's opaque origin matches no concrete target.
        // The payload is a focus nudge and carries nothing worth protecting.
        frameRef.current?.contentWindow?.postMessage(
          { source: "ally-game-host", type: "focus" },
          "*",
        );
      }
      if (data.type === "over" && typeof data.score === "number") {
        handleRunFinished(data.score);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleRunFinished]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-[68ch] flex-col gap-4">
          {payload.intro && (
            <p className="text-center text-sm text-typography-700">{payload.intro}</p>
          )}

          <div className="overflow-hidden rounded-xl border border-border-light bg-white">
            <iframe
              ref={frameRef}
              src={gameUrl(payload.gameKey)}
              title={t("tracks2.game.frameTitle")}
              // No allow-same-origin: the bundle needs no storage or cookies,
              // and without it the frame cannot touch anything of ours.
              sandbox="allow-scripts"
              // The canvas itself is 150px tall; the rest is breathing room,
              // which a phone can spare less of.
              className="block h-[200px] w-full border-0 sm:h-[280px]"
            />
          </div>

          <p className="text-center text-xs text-typography-500">{t("tracks2.game.controls")}</p>

          <div className="flex items-center justify-center gap-6 text-sm">
            {lastScore != null && (
              <span className="text-typography-600">
                {t("tracks2.game.lastScore", { score: lastScore })}
              </span>
            )}
            {bestScore != null && (
              <span className="font-medium text-typography-800">
                {t("tracks2.game.bestScore", { score: bestScore })}
              </span>
            )}
          </div>

          <p className="text-center text-xs text-typography-400">{t("tracks2.game.optional")}</p>
        </div>
      </div>
    </div>
  );
};
