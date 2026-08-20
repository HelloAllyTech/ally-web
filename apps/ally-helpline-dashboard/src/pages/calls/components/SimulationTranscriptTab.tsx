import { FC, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { DropdownField } from "@ally-ui-mono/ui-shared";
import { useGetAudioUrlQuery, useGetSimulationTranscriptQuery } from "@api";
import { TranscriptListing } from "@components";
import { RootState } from "@store";
import { SimulationTranscriptMessage, TranscriptFocusRequest } from "@types";

import { TRANSCRIPT_LANGUAGE_OPTIONS } from "./constants";
import { SimulationTranscriptTabProps } from "./types";

const getTranscriptLanguageLabel = (code: string, originalLanguageCode: string): string => {
  const option = TRANSCRIPT_LANGUAGE_OPTIONS.find(item => item.code === code);
  if (!option) return "English";
  return code === originalLanguageCode ? `${option.label} (Original)` : option.label;
};

const getTranscriptLanguageCode = (
  label: string,
  originalLanguageCode: string,
  stripped = false,
): string => {
  if (!stripped) {
    // Options are rendered with "(Original)" appended for the detected original
    // language, so strip it back off before matching against the raw labels.
    const bareLabel = label.replace(/\s*\(Original\)$/, "");
    return getTranscriptLanguageCode(bareLabel, originalLanguageCode, true);
  }
  return (
    TRANSCRIPT_LANGUAGE_OPTIONS.find(option => option.label === label)?.code ?? originalLanguageCode
  );
};

const SimulationTranscriptTab: FC<SimulationTranscriptTabProps> = ({
  sessionId,
  className,
  councellorName,
  agentName,
  originalLanguageCode = "en",
  focusMessage,
}) => {
  const { t } = useTranslation();
  const [transcriptList, setTranscriptList] = useState<SimulationTranscriptMessage[]>([]);
  /** The moment request, held back until there is a loaded transcript to search. */
  const [resolvedFocus, setResolvedFocus] = useState<TranscriptFocusRequest | null>(null);
  const handledFocusRequestRef = useRef<number | null>(null);
  const [transcriptLanguage, setTranscriptLanguage] = useState<string>(originalLanguageCode);
  /** originalLanguageCode can resolve after mount (parent's language lookup is async);
   * once the user picks a language manually, stop syncing to it. */
  const hasUserSelectedLanguageRef = useRef(false);

  const { user } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (!hasUserSelectedLanguageRef.current) {
      setTranscriptLanguage(originalLanguageCode);
    }
  }, [originalLanguageCode]);

  const {
    data: transcriptData,
    isFetching: isTranscriptFetching,
    isLoading: isTranscriptLoading,
    isError: isTranscriptError,
  } = useGetSimulationTranscriptQuery({
    sessionId,
    // No limit/offset: the reviewer needs the WHOLE transcript. Lazy-paging this
    // view silently truncated it — a 17-minute session showed its first 30 turns
    // (~6 minutes) and load-more never fired — and a partial transcript reads as
    // a partial session, which is worse than a slightly larger response. The
    // backend applies no LIMIT when `limit` is absent, and the admin
    // roleplay-session-log detail already returns the transcript unpaginated.
    offset: undefined,
    limit: undefined,
    sortBy: "startSeconds",
    // Omit languageCode when viewing the original language so the backend returns
    // source text without attempting a translation pass.
    languageCode: transcriptLanguage === originalLanguageCode ? undefined : transcriptLanguage,
  });

  const { data: audioUrlData } = useGetAudioUrlQuery({ sessionId });

  const transcriptQueryBusy = isTranscriptFetching || isTranscriptLoading;

  const transcript = useMemo(() => {
    return transcriptData?.messages?.map(item => ({
      speaker:
        item.senderId === -1 ? t("transcription.clientLabel") : t("transcription.counsellorLabel"),
      content: item.content,
      startSeconds: item.startSeconds,
      id: item.id || null,
      senderId: item.senderId || null,
      tags: item.tags,
    }));
  }, [transcriptData]);

  // Reset transcript list when sessionId or transcript language changes
  useEffect(() => {
    setTranscriptList([]);
  }, [sessionId, transcriptLanguage]);

  useEffect(() => {
    if (isTranscriptError) {
      toast.error(
        t("postSim.tabs.transcriptTranslationFailed", "Failed to load transcript. Please retry."),
      );
    }
  }, [isTranscriptError, t]);

  // Populate from the single full-transcript response
  useEffect(() => {
    if (transcript?.length > 0) {
      const mappedTranscript = transcript.map(item => ({
        id:
          item?.id !== null
            ? item?.id
            : item.speaker === t("transcription.clientLabel")
              ? user?.id
              : -1,
        content: item.content,
        senderId:
          item?.senderId !== null
            ? item?.senderId
            : item.speaker === t("transcription.clientLabel")
              ? user?.id
              : -1,
        startSeconds: item.startSeconds,
        tags: item.tags,
      }));

      // One request returns the whole transcript, so this is a replace, never an
      // append — there is no page to merge and no load-more to arm.
      setTranscriptList(mappedTranscript);
    } else if (transcript?.length === 0) {
      setTranscriptList([]);
    }
  }, [transcript, user?.id, t]);

  // A moment chip can be clicked before the transcript has loaded (this tab
  // mounts on the switch), so hold the request until there is something to
  // search, then either hand it to the listing or say the jump failed.
  useEffect(() => {
    if (!focusMessage) return;
    if (handledFocusRequestRef.current === focusMessage.requestId) return;
    if (transcriptQueryBusy) return;
    // An empty list is either a failed fetch or a session with no transcript —
    // both already say so on screen, so don't stack a second message on top.
    if (!transcriptList.length) return;

    handledFocusRequestRef.current = focusMessage.requestId;
    const targetId = String(focusMessage.messageId);
    if (transcriptList.some(message => String(message.id) === targetId)) {
      setResolvedFocus(focusMessage);
      return;
    }
    // Ally only anchors moments it could resolve, so landing here means the id
    // is outside what this view loaded (e.g. a translated transcript that
    // dropped a turn). Opening the tab is still useful — say the jump didn't
    // land instead of leaving the learner at the top wondering.
    toast.info(t("postSim.debrief.momentNotFound"));
  }, [focusMessage, transcriptQueryBusy, transcriptList, t]);

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col border border-gray-200 rounded-md p-2 custom-scrollbar ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-typography-900 font-primary text-base font-medium">
          {t("postSim.tabs.annotatedTranscript")}
        </span>
        <div className="w-full max-w-[200px] min-w-[140px]">
          <DropdownField
            label={undefined}
            value={getTranscriptLanguageLabel(transcriptLanguage, originalLanguageCode)}
            valueClassName="text-sm font-medium"
            onChange={label => {
              hasUserSelectedLanguageRef.current = true;
              setTranscriptLanguage(getTranscriptLanguageCode(label, originalLanguageCode));
            }}
            options={TRANSCRIPT_LANGUAGE_OPTIONS.map(option =>
              getTranscriptLanguageLabel(option.code, originalLanguageCode),
            )}
            hideSearch
          />
        </div>
      </div>
      <p className="text-xs text-typography-500 mt-1">{t("transcription.accuracyDisclaimer")}</p>
      <hr className="mb-5 mt-2 border-border-light" />
      <TranscriptListing
        transcriptList={transcriptList}
        isLoading={transcriptQueryBusy}
        /* The whole transcript arrives in one response — nothing left to page. */
        hasMore={false}
        counsellorName={councellorName}
        agentName={agentName}
        audioUrl={audioUrlData?.presignedUrl}
        focusRequest={resolvedFocus}
      />
    </div>
  );
};

export default SimulationTranscriptTab;
