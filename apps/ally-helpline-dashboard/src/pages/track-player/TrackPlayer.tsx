import { FC, useCallback, useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useGetLearnTrackDetailQuery, useStartTrackItemMutation } from "@api";
import { NoResults } from "@assets";
import { FallbackUI } from "@components";
import { ErrorBoundary } from "@components/error-boundary/ErrorBoundary";
import { ROUTES } from "@constants";
import {
  StartTrackItemResponse,
  TrackItemCompletionResult,
  TrackItemStatus,
  TrackItemType,
} from "@types";

import { CelebrationKind, CelebrationOverlay } from "./components/CelebrationOverlay";
import { PlayerBottomNav } from "./components/PlayerBottomNav";
import { AnnotationItemPlayer } from "./components/players/annotation/AnnotationItemPlayer";
import { ArticleItemPlayer } from "./components/players/ArticleItemPlayer";
import { GameItemPlayer } from "./components/players/GameItemPlayer";
import { JournalItemPlayer } from "./components/players/JournalItemPlayer";
import { QuizItemPlayer } from "./components/players/quiz/QuizItemPlayer";
import { RoleplayItemPlayer } from "./components/players/RoleplayItemPlayer";
import { VideoItemPlayer } from "./components/players/VideoItemPlayer";
import { PlayerTopBar } from "./components/PlayerTopBar";
import { DiscussionThread } from "./discussion/DiscussionThread";
import { DISCUSSION_POST_QUERY_PARAM } from "./discussion/discussionUtils";
import { useTrackPlayerNavigation } from "./useTrackPlayerNavigation";

/** Arrow-key page turning must not fire while the learner is typing. */
const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "INPUT" ||
    target.tagName === "SELECT"
  );
};

/**
 * Full-screen, page-turner Track 2.0 player. Loads the track detail, starts
 * the current item to fetch its content payload, renders the type-specific
 * player, and gates Next on the item's completion signal. Section/track
 * completion triggers the celebration overlays.
 */
export const TrackPlayer: FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { trackId = "", itemId = "" } = useParams<{ trackId: string; itemId: string }>();
  // `?post=<id>` — set by a discussion-reply notification; the thread
  // scrolls to and flashes that post.
  const [searchParams] = useSearchParams();
  const highlightPostId = searchParams.get(DISCUSSION_POST_QUERY_PARAM);

  const {
    data: track,
    isError: isTrackError,
    refetch: refetchTrack,
  } = useGetLearnTrackDetailQuery({ trackId, languageCode: i18n.language }, { skip: !trackId });
  const [startTrackItem] = useStartTrackItemMutation();

  // Items completed in this player session (drives Next gating optimistically).
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());
  const [celebration, setCelebration] = useState<CelebrationKind | null>(null);

  const nav = useTrackPlayerNavigation(track, trackId, itemId, justCompleted);

  // Direction-aware slide: +1 forward, -1 backward.
  const directionRef = useRef(1);
  const prevIndexRef = useRef(nav.currentIndex);
  useEffect(() => {
    if (nav.currentIndex !== prevIndexRef.current) {
      directionRef.current = nav.currentIndex > prevIndexRef.current ? 1 : -1;
      prevIndexRef.current = nav.currentIndex;
    }
  }, [nav.currentIndex]);

  // Per-item start payload.
  const [payload, setPayload] = useState<StartTrackItemResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoadingItem, setIsLoadingItem] = useState(false);

  const loadItem = useCallback(async () => {
    if (!itemId) return;
    setIsLoadingItem(true);
    setLoadError(false);
    setPayload(null);
    try {
      const data = await startTrackItem({ itemId }).unwrap();
      setPayload(data);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoadingItem(false);
    }
  }, [itemId, startTrackItem]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const handleCompletion = useCallback(
    (result: TrackItemCompletionResult) => {
      if (!result.completed) return;
      setJustCompleted(prev => new Set(prev).add(itemId));
      if (result.trackCompleted) {
        setCelebration("track");
      } else if (result.sectionCompleted) {
        setCelebration("section");
      }
    },
    [itemId],
  );

  const goNextOrOverview = useCallback(() => {
    if (nav.hasNext) nav.goNext();
    else nav.exitToOverview();
  }, [nav]);

  // Keyboard arrows for page turning.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key === "ArrowRight" && nav.canAdvance && nav.hasNext) nav.goNext();
      if (e.key === "ArrowLeft" && nav.hasPrev) nav.goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);

  const sectionItems = nav.current
    ? nav.flat.filter(f => f.sectionId === nav.current?.sectionId)
    : [];

  const alreadyCompleted =
    nav.current?.item.status === TrackItemStatus.COMPLETED || justCompleted.has(itemId);

  // The discussion is appended beneath the item inside one scroll container:
  // each player keeps its own full-height layout and inner scroll, and the
  // thread is reached by scrolling past it. The wrapper depends only on the
  // item's flag (so the player never remounts when the thread appears); the
  // thread itself waits until the item content has loaded.
  const hasDiscussion = nav.current?.item.hasDiscussion === true;
  const isItemReady = !!payload && !loadError && !isLoadingItem;

  const renderItem = () => {
    if (loadError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-typography-700">{t("tracks2.player.loadFailed")}</p>
          <button
            onClick={loadItem}
            className="rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            {t("tracks2.player.retry")}
          </button>
        </div>
      );
    }
    if (isLoadingItem || !payload || !nav.current) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
        </div>
      );
    }

    switch (payload.type) {
      case TrackItemType.ARTICLE:
        return (
          <ArticleItemPlayer
            payload={payload}
            itemId={itemId}
            alreadyCompleted={alreadyCompleted}
            onCompleted={handleCompletion}
          />
        );
      case TrackItemType.VIDEO:
        return (
          <VideoItemPlayer
            payload={payload}
            itemId={itemId}
            trackId={trackId}
            alreadyCompleted={alreadyCompleted}
          />
        );
      case TrackItemType.JOURNAL:
        return (
          <JournalItemPlayer
            payload={payload}
            itemId={itemId}
            alreadyCompleted={alreadyCompleted}
            onCompleted={handleCompletion}
          />
        );
      case TrackItemType.QUIZ:
        return (
          <QuizItemPlayer
            payload={payload}
            itemId={itemId}
            onCompleted={handleCompletion}
            onRequestNext={goNextOrOverview}
          />
        );
      case TrackItemType.ANNOTATED_ARTIFACT:
        return (
          <AnnotationItemPlayer
            payload={payload}
            itemId={itemId}
            alreadyCompleted={alreadyCompleted}
            onCompleted={handleCompletion}
          />
        );
      case TrackItemType.GAME:
        return <GameItemPlayer payload={payload} itemId={itemId} onCompleted={handleCompletion} />;
      case TrackItemType.ROLEPLAY:
      case TrackItemType.CASE:
        return (
          <RoleplayItemPlayer
            payload={payload}
            item={nav.current.item}
            trackId={trackId}
            alreadyCompleted={alreadyCompleted}
          />
        );
      default:
        return null;
    }
  };

  const completedCount = nav.flat.filter(
    f => f.item.status === TrackItemStatus.COMPLETED || justCompleted.has(f.item.id),
  ).length;

  // The track detail fetch backs everything below (nav.current, section
  // titles, progress) — on failure there is no partial view worth showing,
  // so the whole player screen is replaced with a retry state rather than
  // leaving the per-item spinner (renderItem's own fallback) spinning
  // forever with nothing to trigger a refetch.
  if (isTrackError) {
    return (
      <div className="fixed inset-0 z-40 flex h-[100dvh] w-full items-center justify-center bg-white font-primary">
        <FallbackUI
          icon={<NoResults />}
          mainMessage={t("tracks2.player.trackLoadFailed")}
          description={t("tracks2.player.trackLoadFailedDescription")}
          button={{ text: t("tracks2.player.retry"), onClick: refetchTrack }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex h-[100dvh] w-full flex-col bg-white font-primary">
      <PlayerTopBar
        sectionTitle={nav.current?.sectionTitle ?? ""}
        sectionItems={sectionItems}
        currentItemId={itemId}
        overallPct={nav.overallPct}
        onExit={nav.exitToOverview}
        onSegmentClick={nav.goToItem}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={directionRef.current}>
          <motion.div
            key={itemId}
            custom={directionRef.current}
            initial={{ opacity: 0, x: directionRef.current * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: directionRef.current * -40 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80 && nav.canAdvance && nav.hasNext) nav.goNext();
              else if (info.offset.x > 80 && nav.hasPrev) nav.goPrev();
            }}
            className="h-full min-h-0"
          >
            {hasDiscussion ? (
              <div data-testid="track-item-scroll" className="h-full min-h-0 overflow-y-auto">
                <div className="h-full min-h-0">
                  <ErrorBoundary variant="panel" resetKey={itemId}>
                    {renderItem()}
                  </ErrorBoundary>
                </div>
                {isItemReady && (
                  <ErrorBoundary variant="panel" resetKey={`discussion-${itemId}`}>
                    <DiscussionThread itemId={itemId} highlightPostId={highlightPostId} />
                  </ErrorBoundary>
                )}
              </div>
            ) : (
              <ErrorBoundary variant="panel" resetKey={itemId}>
                {renderItem()}
              </ErrorBoundary>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <PlayerBottomNav
        hasPrev={nav.hasPrev}
        hasNext={nav.hasNext}
        canAdvance={nav.canAdvance}
        onPrev={nav.goPrev}
        onNext={goNextOrOverview}
        isLastItem={!nav.hasNext}
      />

      <CelebrationOverlay
        kind={celebration}
        completedCount={completedCount}
        onContinue={() => {
          setCelebration(null);
          goNextOrOverview();
        }}
        onBackToLearn={() => {
          setCelebration(null);
          navigate(`${ROUTES.LEARN}?tab=courses`);
        }}
      />
    </div>
  );
};

export default TrackPlayer;
