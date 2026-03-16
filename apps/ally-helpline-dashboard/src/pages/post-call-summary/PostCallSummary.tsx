import { useEffect, useState } from "react";

import { Tooltip } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { FEATURE_FLAGS_MAP, Tabs } from "@ally-ui-mono/ui-shared";
import {
  useCreateScribeReviewMutation,
  useGetCallSummaryQuery,
  useUpdateScribeReviewMutation,
} from "@api";
import { BackCircle, Comment } from "@assets";
import { REVIEW_PRIVACY_OPTIONS_VALUES, ROUTES } from "@constants";
import { CallTranscriptTab } from "@pages/calls/components";
import { ShareForReview, ToggleSwitch } from "@src/components";
import { ShareForReviewsScribeInput } from "@types";
import { updateQueryParamListWithoutReload } from "@utils";

import { CallSummary, StressBusterStep } from "./components";
import { SectionQueryKey, getSummaryTabs } from "./constants";
import { SectionType } from "./types";
import {
  getNumberForSectionKey,
  getSectionTabForIndex,
  getSelectedSection,
  isSourceDeeplink,
} from "./utils";

export const PostCallSummary = () => {
  const { chatId } = useParams();
  const { t } = useTranslation();
  const summaryTabs = getSummaryTabs(t);
  const [searchParams] = useSearchParams();

  const [selectedTab, setSelectedTab] = useState<SectionType>(SectionType.SessionSummary);
  const [shareForReview, setShareForReview] = useState<boolean>(false);

  const {
    data: individualCallSummary,
    refetch: refetchCallSummary,
    isLoading: isSummaryLoading,
    error: summaryLoadingError,
  } = useGetCallSummaryQuery(Number(chatId));
  const [createScribeReview] = useCreateScribeReviewMutation();
  const [updateScribeReview] = useUpdateScribeReviewMutation();

  useEffect(() => {
    const sectionNumber = Number(getSelectedSection(searchParams));
    setSelectedTab(getSectionTabForIndex(sectionNumber));
  }, [searchParams]);

  const isDeeplink = isSourceDeeplink(searchParams);

  const navigate = useNavigate();

  const gotoSummaryTab = () => {
    onTabChange(null, SectionType.SessionSummary);
  };

  const handleCreateReview = async ({
    note,
    scribeSessionId,
    status,
  }: {
    note?: string;
    scribeSessionId?: number;
    status: string;
  }) => {
    const normalizedNote = note?.trim() || null;
    try {
      if (individualCallSummary?.reviewId) {
        const params: ShareForReviewsScribeInput = {
          scribeSessionId: individualCallSummary?.reviewId,
          status,
        };
        if (status !== REVIEW_PRIVACY_OPTIONS_VALUES.HIDDEN) params.note = normalizedNote;
        await updateScribeReview(params).unwrap();
      } else {
        const params: ShareForReviewsScribeInput = {
          scribeSessionId: scribeSessionId,
          status,
          note: normalizedNote,
        };

        await createScribeReview(params).unwrap();
      }
    } catch (err: any) {
      const message =
        err?.data?.message ?? err?.message ?? "Something went wrong. Please try again.";
      toast.error(message);
    }
  };

  const handleToggleChange = (value: string) => {
    if (value === REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW) {
      setShareForReview(true);
    } else {
      handleCreateReview({ status: value });
    }
  };

  const Header = () => (
    <div className="flex items-center gap-2 font-secondary justify-between">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(ROUTES.CALLS)}>
          <BackCircle />
        </button>
        <span className="text-4xl">Session</span>
        <span className="text-4xl font-semibold italic">Summary</span>
      </div>
      <div className="flex items-center gap-2">
        {FEATURE_FLAGS_MAP.SCRIBE_REVIEW_FLAG &&
          individualCallSummary?.details?.transcript?.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-primary font-normal text-sm">Share for review</span>{" "}
              <ToggleSwitch
                enabled={
                  individualCallSummary?.reviewStatus === REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW
                }
                onChange={(value: boolean) => {
                  handleToggleChange(
                    value
                      ? REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW
                      : REVIEW_PRIVACY_OPTIONS_VALUES.HIDDEN,
                  );
                }}
              />
            </div>
          )}
        {individualCallSummary?.reviewId && (
          <>
            <div className="border-l border-border h-5" />
            <Tooltip title="Comments" arrow>
              <button
                onClick={() =>
                  navigate(
                    ROUTES.SCRIBE_REVIEW_DETAILS?.replace(
                      ":reviewId",
                      individualCallSummary.reviewId,
                    ),
                  )
                }
                className="flex items-center justify-center h-[40px] w-[40px]"
              >
                <Comment className="w-6 h-6 shrink-0" />
                {/* <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{TODO: Add count of unread messages}</div> */}
              </button>
            </Tooltip>
          </>
        )}
      </div>
      <ShareForReview
        isOpen={shareForReview}
        onClose={() => {
          setShareForReview(false);
        }}
        summaryDetails={individualCallSummary}
        onNoteChange={(note: string) => {
          handleCreateReview({
            scribeSessionId: individualCallSummary?.id,
            status: REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW,
            note,
          });
        }}
        tag={"Scribe"}
      />
    </div>
  );

  const renderSection = () => {
    switch (selectedTab) {
      case SectionType.BoxBreathing:
        return <StressBusterStep onProceed={gotoSummaryTab} />;
      case SectionType.SessionSummary:
        return (
          <CallSummary
            className="max-h-[calc(100vh-300px)]"
            chatId={Number(chatId)}
            callSummary={individualCallSummary}
            onRefetchSummary={refetchCallSummary}
            isSummaryLoading={isSummaryLoading}
            summaryLoadingError={summaryLoadingError}
          />
        );
      case SectionType.Transcript:
        return <CallTranscriptTab callSummary={individualCallSummary} />;
      default:
        return null;
    }
  };

  const onTabChange = (_event: React.SyntheticEvent, newValue: SectionType) => {
    setSelectedTab(newValue);

    const queryParamList = [
      { key: SectionQueryKey, value: getNumberForSectionKey(newValue)?.toString() },
    ];
    updateQueryParamListWithoutReload(queryParamList);
  };

  const Content = () => (
    <motion.div
      layout="position"
      layoutId="content-container"
      transition={{ duration: 0.3 }}
      className="h-fit overflow-hidden w-full"
    >
      <motion.div className="flex flex-col gap-4" layout={false}>
        {renderSection()}
      </motion.div>
    </motion.div>
  );

  return (
    <div className="h-[100vh] w-[50%] pt-6 mx-auto flex flex-col gap-4 items-center bg-white">
      {isDeeplink ? (
        <Content />
      ) : (
        <>
          <div className="w-full border-b border-[#E5E7EB]">
            <Header />
            <Tabs
              items={summaryTabs.map(tab => ({ id: tab.value, label: tab.label }))}
              activeId={selectedTab}
              onChange={newId => onTabChange(null, newId as SectionType)}
              className="border-none w-full text-base font-primary"
              showCount={false}
            />
          </div>
          <Content />
        </>
      )}
    </div>
  );
};
