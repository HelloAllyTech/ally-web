import { FC, useCallback, useEffect, useRef, useState } from "react";

import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import {
  useEnrollTrackMutation,
  useGetPublicTrackOutlineQuery,
  useLazyGetNextTrackItemQuery,
  useLazyGetTrackAccessQuery,
} from "@api";
import { Ally } from "@assets";
import { LoginDialog } from "@components";
import { LOCAL_STORAGE_KEYS, ROUTES, buildTrackItemRoute, buildTrackRoute } from "@constants";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";
import { useAnalytics, useUser } from "@hooks";
import { TrackAccessDenialReason } from "@types";
import { sanitizeHtml } from "@utils";

import { CourseOutline } from "./components/CourseOutline";
import { StoryLanding } from "./story/StoryLanding";
import { usePageMeta } from "../blog/usePageMeta";

const isSignedIn = () => Boolean(localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN));

/**
 * - `browsing`: a visitor reading the outline (signed out, or not yet checked).
 * - `checking`: a signed-in learner's access is being asked.
 * - `starting`: they have access and are being enrolled and sent to the first step.
 * - `denied`: signed in, but this course is not theirs to take.
 */
type LandingPhase = "browsing" | "checking" | "starting" | "denied";

/**
 * Landing page behind a course's public share link (`/course/:trackId`).
 *
 * Anyone can read the outline — the endpoint serves it only while the author
 * has public view on and the course is published, and 404s otherwise, which
 * this page shows as "not available". Pressing Start asks a signed-out
 * visitor to log in, then runs the same access rules as the rest of the app:
 * a learner the course is assigned to is enrolled and taken to the first
 * step; anyone else is told it is not available to them. A learner who
 * arrives already signed in with access goes straight to the course page.
 *
 * Once the author has written a hook the page uses the story layout
 * (`story/StoryLanding`); without one it is the classic outline below. Both
 * share the same Start flow and states.
 */
export const CourseLanding: FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { trackId = "" } = useParams<{ trackId: string }>();
  const { user } = useUser();
  const { track } = useAnalytics();

  const {
    data: outline,
    isLoading,
    isError,
  } = useGetPublicTrackOutlineQuery({ trackId, languageCode: i18n.language }, { skip: !trackId });
  const [checkAccess] = useLazyGetTrackAccessQuery();
  const [enrollTrack] = useEnrollTrackMutation();
  const [getNextItem] = useLazyGetNextTrackItemQuery();

  const [phase, setPhase] = useState<LandingPhase>(isSignedIn() ? "checking" : "browsing");
  const [deniedReason, setDeniedReason] = useState<TrackAccessDenialReason | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  // Whether the login was opened by Start (go straight in) or by the header's
  // Log in (land on the course page, like arriving signed in).
  const startAfterLoginRef = useRef(false);

  usePageMeta({ title: outline?.title ?? t("courseLanding.documentTitle") });

  const deny = (reason: TrackAccessDenialReason | null, announce: boolean) => {
    setDeniedReason(reason);
    setPhase("denied");
    if (announce) toast.error(t("courseLanding.denied.toast"));
  };

  /**
   * Signed in: may they take it? With `startNow` (they pressed Start), enrol
   * them and open the next step; otherwise open the course page.
   */
  const continueSignedIn = useCallback(
    async (startNow: boolean) => {
      setPhase("checking");
      try {
        const access = await checkAccess({ trackId }).unwrap();
        if (!access.hasAccess) {
          deny(access.reason, startNow);
          return;
        }
        if (!startNow) {
          navigate(buildTrackRoute(trackId), { replace: true });
          return;
        }
        setPhase("starting");
        if (!access.enrolled) {
          await enrollTrack({ trackId, languageCode: i18n.language }).unwrap();
        }
        const next = await getNextItem({ trackId }).unwrap();
        navigate(
          !next.trackCompleted && next.nextItem
            ? buildTrackItemRoute(trackId, next.nextItem.id)
            : buildTrackRoute(trackId),
          { replace: true },
        );
      } catch (error) {
        // An account without learner permissions is refused by the permission
        // guard before the access check runs — to them it is the same answer.
        if ((error as FetchBaseQueryError | undefined)?.status === 403) {
          deny(null, startNow);
          return;
        }
        setPhase("browsing");
        toast.error(t("common.somethingWentWrong"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackId, i18n.language],
  );

  // Arriving already signed in: answer the access question once the outline
  // has confirmed the link is live.
  useEffect(() => {
    if (outline && isSignedIn()) void continueSignedIn(false);
  }, [outline?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openLogin = (startAfter: boolean) => {
    startAfterLoginRef.current = startAfter;
    setIsLoginOpen(true);
  };

  const handleStart = () => {
    if (phase !== "browsing") return;
    if (isSignedIn()) {
      void continueSignedIn(true);
    } else {
      openLogin(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoginOpen(false);
    void continueSignedIn(startAfterLoginRef.current);
  };

  // Signed-in learners get the app's navbar from the layout; a visitor gets a
  // slim bar with the wordmark and, where the page can act on it, Log in.
  // The wordmark is the brand SVG the login page uses, not "ally" typed in a
  // font — a share link is often someone's first sight of Ally.
  const renderHeader = (withLogin: boolean, wide = false) =>
    !user && (
      <header className="sticky top-0 z-20 border-b border-border-light bg-white/95 backdrop-blur">
        <div
          className={`mx-auto flex w-full items-center justify-between px-4 py-3 sm:px-6 ${
            wide ? "max-w-4xl" : "max-w-3xl"
          }`}
        >
          <Ally role="img" aria-label="Ally" className="h-7 w-auto text-typography-900" />
          {withLogin && !isSignedIn() && (
            <button
              type="button"
              onClick={() => openLogin(false)}
              className="rounded-full border border-primary-500 px-4 py-1.5 text-sm font-medium text-primary-500 transition-colors hover:bg-primary-50 max-md:min-h-11"
            >
              {t("courseLanding.logIn")}
            </button>
          )}
        </div>
      </header>
    );

  const loginDialog = (
    <LoginDialog
      isOpen={isLoginOpen}
      onClose={() => setIsLoginOpen(false)}
      onSuccess={handleLoginSuccess}
      requireTerms
    />
  );

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-500" />
      </div>
    );
  }

  if (isError || !outline) {
    return (
      <div className="flex min-h-full flex-col bg-white font-primary">
        {renderHeader(false)}
        <div
          className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
          data-testid="course-landing-unavailable"
        >
          <h1 className="mb-2 text-xl font-semibold text-typography-900">
            {t("courseLanding.unavailable.title")}
          </h1>
          <p className="mb-6 max-w-md text-sm text-typography-700">
            {t("courseLanding.unavailable.body")}
          </p>
          <button
            type="button"
            onClick={() => navigate(isSignedIn() ? `${ROUTES.LEARN}?tab=courses` : ROUTES.LOGIN)}
            className="rounded-full bg-primary-500 px-6 py-2 text-white transition-colors hover:bg-primary-600 max-md:min-h-11"
          >
            {isSignedIn() ? t("courseLanding.goToCourses") : t("courseLanding.logIn")}
          </button>
        </div>
      </div>
    );
  }

  const isBusy = phase === "checking" || phase === "starting";
  const hasDuration = !!outline.estimatedDurationMinutes;

  const deniedBox = (
    <div
      role="status"
      className="mb-6 rounded-xl border border-warning-200 bg-warning-50 p-4"
      data-testid="course-landing-denied"
    >
      <p className="mb-1 font-semibold text-typography-900">
        {deniedReason === TrackAccessDenialReason.NOT_AVAILABLE
          ? t("courseLanding.denied.closedTitle")
          : t("courseLanding.denied.title")}
      </p>
      <p className="mb-3 text-sm text-typography-800">
        {deniedReason === TrackAccessDenialReason.NOT_AVAILABLE
          ? t("courseLanding.denied.closedBody")
          : user?.email
            ? t("courseLanding.denied.bodyWithEmail", { email: user.email })
            : t("courseLanding.denied.body")}
      </p>
      <button
        type="button"
        onClick={() => navigate(`${ROUTES.LEARN}?tab=courses`)}
        className="rounded-full bg-primary-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 max-md:min-h-11"
      >
        {t("courseLanding.goToCourses")}
      </button>
    </div>
  );

  if (outline.story) {
    return (
      <div className="flex min-h-full flex-col bg-background font-primary">
        {renderHeader(true, true)}
        <StoryLanding
          outline={outline}
          story={outline.story}
          onStart={phase === "denied" ? null : handleStart}
          isBusy={isBusy}
          isSignedIn={isSignedIn()}
          denied={deniedBox}
          onFirstMovePick={replyIndex =>
            track(ANALYTICS_EVENTS.COURSE_LANDING_FIRST_MOVE_CHOSEN, {
              [ANALYTICS_PROPS.COURSE_ID]: outline.id,
              [ANALYTICS_PROPS.REPLY_INDEX]: replyIndex,
            })
          }
        />
        {loginDialog}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-white font-primary">
      {renderHeader(true)}
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
        {outline.coverImageUrl && (
          <div className="relative mt-4 h-[140px] w-full overflow-hidden rounded-[12px] sm:h-[220px]">
            <CustomImage
              src={outline.coverImageUrl}
              alt={outline.title}
              className="h-full w-full bg-background-secondary object-cover"
            />
          </div>
        )}

        <div className="pt-4 sm:pt-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary-600">
            {t("courseLanding.eyebrow")}
          </span>
          <h1 className="mb-1 mt-1 text-xl font-bold text-typography-900 sm:text-2xl">
            {outline.title}
          </h1>
          <p className="mb-4 text-sm text-typography-700">
            {hasDuration
              ? t("courseLanding.summaryWithDuration", {
                  count: outline.totalItems,
                  minutes: outline.estimatedDurationMinutes,
                })
              : t("courseLanding.summary", { count: outline.totalItems })}
          </p>

          {outline.description && (
            <div
              className="mb-4 break-words text-sm leading-relaxed text-typography-800 sm:text-base"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(outline.description) }}
            />
          )}

          {phase === "denied" ? (
            deniedBox
          ) : (
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <button
                type="button"
                onClick={handleStart}
                disabled={isBusy}
                className="w-full rounded-full bg-primary-500 px-6 py-2 font-tertiary text-base font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-60 max-md:min-h-11 sm:w-auto"
              >
                {isBusy ? t("common.starting") : t("courseLanding.start")}
              </button>
              {!isSignedIn() && (
                <span className="text-xs text-typography-700">{t("courseLanding.loginHint")}</span>
              )}
            </div>
          )}
        </div>

        <CourseOutline sections={outline.sections} />
      </main>
      {loginDialog}
    </div>
  );
};

export default CourseLanding;
