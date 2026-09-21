import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { useRecordGameResultMutation } from "@api";
import { NoResults } from "@assets";
import { FallbackUI } from "@components";
import { StartGameItemPayload, TrackItemCompletionResult, TrackGameKey } from "@types";

interface GameItemPlayerProps {
  payload: StartGameItemPayload;
  itemId: string;
  onCompleted: (result: TrackItemCompletionResult) => void;
}

/** A game bundle is a static page served from the app's own public dir. */
const gameUrl = (key: TrackGameKey) => `/games/${key.toLowerCase()}/index.html`;

/**
 * How tall a frame each game needs. A bundle sizes itself to whatever viewport
 * it is given, so this is the one thing about a game the host has to know: the
 * runner is a 150px canvas, a board game needs room for a board.
 */
const FRAME_HEIGHT: Record<TrackGameKey, string> = {
  [TrackGameKey.TREX_RUNNER]: "h-[200px] sm:h-[280px]",
  [TrackGameKey.TIC_TAC_TOE]: "h-[420px] sm:h-[440px]",
  [TrackGameKey.MEMORY_MATCH]: "h-[380px] sm:h-[470px]",
  // Taller than the rest: the puzzle spins, so the board needs the room its
  // corners sweep through, and the level list opens into the same frame.
  [TrackGameKey.CUB_N_PUP]: "h-[440px] sm:h-[560px]",
  [TrackGameKey.SNAKE]: "h-[400px] sm:h-[440px]",
  // The plant grows upwards and the moisture meter runs the full height, so
  // this one wants height more than width.
  [TrackGameKey.SPROUT]: "h-[420px] sm:h-[520px]",
};

/**
 * Words a bundle draws inside its own frame, by game.
 *
 * A bundle is a static page with no reach into the app, so it cannot read the
 * learner's language for itself — anything it renders in words has to be handed
 * to it on the `focus` message. The runner and the tic-tac-toe board are pure
 * canvas and need nothing; the memory deck has a move counter and an
 * end-of-round card, the snake has a score/best readout and a game-over line,
 * the puzzle has a level list, a solved count and the lines that teach it, and
 * the plant has a picker, a running commentary and the whole of its
 * screen-reader narration, so those four get these. A bundle falls back to its
 * own baked-in English if the host sends nothing, which keeps this list
 * optional.
 */
const FRAME_STRING_NAMES: Partial<Record<TrackGameKey, readonly string[]>> = {
  [TrackGameKey.MEMORY_MATCH]: [
    "moves",
    "restart",
    "wonTitle",
    "wonDetail",
    "playAgain",
    "cardLabel",
  ],
  [TrackGameKey.SNAKE]: ["score", "best", "restart", "gameOver"],
  [TrackGameKey.CUB_N_PUP]: [
    "levels",
    "close",
    "nextLevel",
    "solved",
    "tutorial",
    "hintDragToStar",
    "hintRotate",
    "hintFree",
    "hintPivot",
    "hintRotateLink",
  ],
  /*
   * The longest list here by some way, and deliberately so: the plant's scene
   * is aria-hidden, which makes the live region the entire game for a screen
   * reader. Every one of these is read aloud to somebody.
   */
  [TrackGameKey.SPROUT]: [
    "pickerLabel",
    "plantSUCCULENT",
    "plantMARIGOLD",
    "plantFERN",
    "plantTOMATO",
    "visitorsLabel",
    "hintStart",
    "aimSoil",
    "aimLeaves",
    "aimAway",
    "stateDry",
    "stateGood",
    "stateWet",
    "stage0",
    "stage1",
    "stage2",
    "stage3",
    "stage4",
    "stage5",
    "leafDropped",
    "leafScorched",
    "bloomed",
    "plantAnother",
    "visitorArrived",
    "visitorBEE",
    "visitorBUTTERFLY",
    "visitorLADYBIRD",
  ],
};

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
  // Bumped to force-remount the iframe on retry (a fresh `src` load, not a
  // reload of whatever crashed state the old document was left in).
  const [frameAttempt, setFrameAttempt] = useState(0);
  const [frameFailed, setFrameFailed] = useState(false);

  /**
   * `skipInterpolation` because these are templates for the bundle to fill in,
   * not finished sentences — without it i18next would resolve `{{moves}}` here
   * against nothing and hand the frame a string with the number cut out.
   */
  const gameKey = payload.gameKey;
  const frameStrings = useMemo(() => {
    const names = FRAME_STRING_NAMES[gameKey];
    if (!names) return undefined;
    return Object.fromEntries(
      names.map(name => [
        name,
        t(`tracks2.game.frameStrings.${gameKey}.${name}`, { skipInterpolation: true }),
      ]),
    );
  }, [gameKey, t]);

  // The server already completed this item; tell the player so Next unlocks.
  // This fires regardless of whether the iframe below ever loads, so a
  // broken game bundle never blocks track progression — no separate
  // skip/mark-complete affordance is needed for the failure case below.
  const completion = payload.completion;
  useEffect(() => {
    onCompleted(completion);
  }, [completion, onCompleted]);

  const handleFrameRetry = useCallback(() => {
    setFrameFailed(false);
    setFrameAttempt(attempt => attempt + 1);
  }, []);

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
        // The payload is a focus nudge plus display copy, neither of which is
        // worth protecting.
        frameRef.current?.contentWindow?.postMessage(
          { source: "ally-game-host", type: "focus", strings: frameStrings },
          "*",
        );
      }
      if (data.type === "over" && typeof data.score === "number") {
        handleRunFinished(data.score);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameStrings, handleRunFinished]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-[68ch] flex-col gap-4">
          {payload.intro && (
            <p className="text-center text-sm text-typography-700">{payload.intro}</p>
          )}

          <div className="overflow-hidden rounded-xl border border-border-light bg-white">
            {frameFailed ? (
              <div className={`flex items-center justify-center ${FRAME_HEIGHT[payload.gameKey]}`}>
                <FallbackUI
                  icon={<NoResults />}
                  mainMessage={t("tracks2.game.loadFailed")}
                  description={t("tracks2.game.loadFailedDescription")}
                  button={{ text: t("tracks2.player.retry"), onClick: handleFrameRetry }}
                />
              </div>
            ) : (
              <iframe
                key={frameAttempt}
                ref={frameRef}
                src={gameUrl(payload.gameKey)}
                title={t("tracks2.game.frameTitle")}
                // No allow-same-origin: the bundle needs no storage or cookies,
                // and without it the frame cannot touch anything of ours.
                sandbox="allow-scripts"
                className={`block w-full border-0 ${FRAME_HEIGHT[payload.gameKey]}`}
                // Reliable only for a genuine load failure on the initial
                // document (e.g. a 404 on the bundle) — an in-app JS error
                // inside the sandboxed frame won't trigger this. Still
                // strictly better than the blank white box learners saw
                // before, and the frame is remountable via the key bump above.
                onError={() => setFrameFailed(true)}
              />
            )}
          </div>

          <p className="text-center text-xs text-typography-500">
            {t(`tracks2.game.controlsByGame.${payload.gameKey}`)}
          </p>

          <div className="flex items-center justify-center gap-6 text-sm">
            {lastScore != null && (
              <span className="text-typography-600">
                {t(`tracks2.game.lastScoreByGame.${payload.gameKey}`, { score: lastScore })}
              </span>
            )}
            {bestScore != null && (
              <span className="font-medium text-typography-800">
                {t(`tracks2.game.bestScoreByGame.${payload.gameKey}`, { score: bestScore })}
              </span>
            )}
          </div>

          <p className="text-center text-xs text-typography-400">{t("tracks2.game.optional")}</p>
        </div>
      </div>
    </div>
  );
};
