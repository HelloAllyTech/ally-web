import { FC, useEffect, useState } from "react";

import { CircularProgress, Divider, Tooltip } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logger, DropdownField } from "@ally-ui-mono/ui-shared";
import {
  useGetSummaryFieldsQuery,
  useUpdateCallSummaryMutation,
  useGetTagsMutation,
  useGetLocationsQuery,
  useLazySearchLocationsQuery,
  useUpdateCallSummaryNotesMutation,
  useGetCallSummaryQuery,
} from "@api";
import { Assessment, PageNotFoundIllustration, Warning } from "@assets";
import { Accordion, TextField, Button, InfoBanner, FallbackUI } from "@components";
import { LanguageMap, Permissions, ROUTES, toolTipStyles } from "@constants";
import { FeedbackDialog } from "@containers";
import { useEnhance, useDebounce } from "@hooks";
import { RootState } from "@store";
import { ChatSummaryStatus, SessionType, SummaryFieldKey, Tag } from "@types";
import { getEstimatedSummaryGenerationTime, getFormattedDateTime, hasPermissions } from "@utils";

import { SummaryLoading } from ".";
import { getSummaryFields, getSummarySections, labelShownSections } from "../constants";
import { CallSummaryProps, FieldType, SummaryField, SummarySectionKey } from "../types";
import { getSectionFields } from "../utils";

// TODO: Keep it outside the pages since two pages are using this componentß

const CallSummary: FC<CallSummaryProps> = ({
  chatId,
  isInSidebar = false,
  className,
  headerContent,
  postProcess,
  canEditSummary = true,
  callSummaryData: callSummaryDataProp,
  onRefetchSummary,
}) => {
  const { t } = useTranslation();
  const { permissions, user } = useSelector((state: RootState) => state.user);
  const sections = getSummarySections(t);
  const translatedFields = getSummaryFields(t);

  const [summaryData, setSummaryData] = useState(null);
  const [searchedLocations, setSearchedLocations] = useState(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [canShowSummary, setCanShowSummary] = useState<boolean>(true);

  const initialNotes = summaryData?.details?.callInfo?.notes || "";

  const [notes, setNotes] = useState<string>(initialNotes);

  const navigate = useNavigate();

  const {
    data: callSummaryFromQuery,
    refetch: refetchFromQuery,
    isLoading: isSummaryLoading,
    error: summaryLoadingError,
  } = useGetCallSummaryQuery(chatId, { skip: callSummaryDataProp != null });

  const callSummary = callSummaryDataProp != null ? callSummaryDataProp : callSummaryFromQuery;
  const refetchSummary = onRefetchSummary ?? refetchFromQuery;
  const { data: visibleFields, isLoading: isGetSummaryFieldsLoading } = useGetSummaryFieldsQuery(
    undefined,
    {
      skip: !hasPermissions(permissions, Permissions.VIEW_SUMMARY_FIELDS),
    },
  );
  const [updateCallSummary, { isLoading: isUpdateLoading }] = useUpdateCallSummaryMutation();
  const [getTags, { isLoading: isGetTagsLoading }] = useGetTagsMutation();
  const { data: locations, isLoading: isGetLocationsLoading } = useGetLocationsQuery();
  const [searchLocations, { isLoading: isSearchLocationsLoading }] = useLazySearchLocationsQuery();
  const [updateCallSummaryNotes, { isLoading: isUpdateNotesLoading }] =
    useUpdateCallSummaryNotesMutation();

  const { enhancing, EnhanceButton, EnhancementLoadingSkeleton, isEnhanceLoading } = useEnhance();

  // Determine if editing should be allowed
  // If canEditSummary is explicitly false (from ConsolidatedLogs), respect that
  // Otherwise (true/undefined/default), check permissions and counselor match
  const hasEditSummaryPermission = permissions?.includes(Permissions.EDIT_CALL_DETAILS);
  const isCounsellorForCall = Boolean(
    user?.userId && callSummary?.counselorId && callSummary.counselorId === user.userId,
  );
  const shouldAllowEdit =
    canEditSummary !== false && hasEditSummaryPermission && isCounsellorForCall;

  const isLoading =
    isGetSummaryFieldsLoading ||
    isSummaryLoading ||
    isUpdateLoading ||
    isEnhanceLoading ||
    isGetTagsLoading ||
    isGetLocationsLoading ||
    isSearchLocationsLoading;

  useEffect(() => {
    if (callSummary?.summaryStatus === ChatSummaryStatus.SUCCESS) {
      const tags = callSummary.details.summary?.tags;
      setSummaryData({
        ...callSummary.details.summary,
        tags: tags?.map(({ tag }) => tag).join(", "),
      });
      if (isInSidebar) {
        postProcess?.(ChatSummaryStatus.SUCCESS);
      }
      setTimeout(() => {
        setCanShowSummary(true);
      }, 4000);
    }
  }, [callSummary?.summaryStatus, isInSidebar]);

  useEffect(() => {
    if (initialNotes?.length > 0) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);

  const onHandleSearch = async (query: string) => {
    if (query) {
      const response = await searchLocations({ query });
      if (response.error) {
        logger.info(`Error searching locations: ${response.error}`);
      } else if (response.data) {
        setSearchedLocations(response.data);
      }
    } else {
      setSearchedLocations(null);
    }
  };

  const getDropdownOptions = (key: string, options: string[]) => {
    if (key === SummaryFieldKey.Location) {
      const locationData = searchedLocations || locations?.data || [];
      return locationData.map(({ city, state }) => `${city} - ${state}`) || [];
    }
    return options ?? [];
  };

  const getFieldValue = (key: string, type: string) => {
    if (!summaryData) {
      return type !== FieldType.Dropdown ? "--" : "";
    }
    switch (key) {
      case SummaryFieldKey.CallId:
        return callSummary?.details?.chatId || summaryData.callId;
      case SummaryFieldKey.CallDuration: {
        const duration = callSummary?.details?.callDuration || summaryData.callDuration;
        return duration
          ? `${Math.floor(Number(duration) / 60)} ${t("common.minutes_other", { count: Math.floor(Number(duration) / 60) })}`
          : "--";
      }
      case SummaryFieldKey.CallDate:
        return getFormattedDateTime(callSummary?.details?.startTime, "do MMMM yyyy");
      case SummaryFieldKey.CallTime: {
        return `${getFormattedDateTime(callSummary?.startedAt, "HH:mm")} - ${getFormattedDateTime(
          callSummary?.endedAt,
          "HH:mm",
        )}`;
      }
      case SummaryFieldKey.ClientId: {
        const clientId = callSummary?.clientId || summaryData.clientId;
        if (clientId === -1) {
          return "N/A";
        }
        return clientId;
      }
      case SummaryFieldKey.Languages:
        return (
          summaryData.languages
            ?.map(({ language, percentage }) => `${LanguageMap[language]} (${percentage}%)`)
            .join(", ") || ""
        );
      case SummaryFieldKey.ListeningShare:
        return `${(callSummary?.details?.callInfo?.clientTalkingPercentage ?? 0) * 100}%`;
      default:
        return summaryData[key];
    }
  };

  const isFieldDisabled = (field: SummaryField) => {
    return !field.isEditable || !shouldAllowEdit;
  };

  const getFieldDisplay = (field: SummaryField) => {
    const value = getFieldValue(field.key, field.type);
    switch (field.type) {
      case FieldType.Dropdown:
        return (
          <div key={field.key} className="flex gap-1">
            <span className="font-medium text-lg text-typography-800 whitespace-nowrap bg-green">{`${field.label}: `}</span>
            <DropdownField
              disabled={isFieldDisabled(field)}
              value={value ?? field.placeholder ?? "--"}
              valueClassName={`${field.isEditable ? "text-typography-900" : "text-typography-800"} 
                text-lg font-primary`}
              onChange={value => setSummaryData(prev => ({ ...prev, [field.key]: value }))}
              onHandleSearch={field.key === SummaryFieldKey.Location ? onHandleSearch : undefined}
              options={getDropdownOptions(field.key, field.options)}
            />
          </div>
        );
      case FieldType.Multiline:
        return (
          <div key={field.key} className="flex flex-col gap-1">
            {labelShownSections?.includes(field.sectionKey) && (
              <span className="font-medium text-lg text-typography-800">{`${field.label}: `}</span>
            )}
            <TextField
              value={enhancing === field.key ? "" : value || ""}
              onChange={e =>
                setSummaryData(prev => ({
                  ...prev,
                  [field.key]: e.target.value,
                }))
              }
              multiline
              rows={field.key === SummaryFieldKey.SessionSummary ? 10 : 4}
              className="w-full"
              inputStyles={{
                color: field.isEditable ? "#1A1A1A" : "#9CA3AF",
                fontSize: "16px",
                fontFamily: "IBM_Plex_Serif",
                cursor: enhancing === field.key ? "not-allowed" : "auto",
              }}
              placeholder={enhancing === field.key ? "" : field.placeholder}
              showBorder={false}
              InputProps={{
                readOnly: isFieldDisabled(field),
                startAdornment: enhancing === field.key && EnhancementLoadingSkeleton,
                endAdornment: field.isEnhanceable && shouldAllowEdit && value && value.trim() && (
                  <Tooltip
                    title={t("summary.enhance")}
                    placement="bottom"
                    arrow
                    slotProps={toolTipStyles}
                  >
                    <span className="absolute bottom-2 right-2">
                      <EnhanceButton
                        fieldName={field.key}
                        inputText={value}
                        updateValue={text =>
                          setSummaryData(prev => ({
                            ...prev,
                            [field.key]: text,
                          }))
                        }
                      />
                    </span>
                  </Tooltip>
                ),
              }}
            />
          </div>
        );
      case FieldType.Number:
      case FieldType.Text:
      default:
        return (
          <div key={field.key}>
            <div className="flex items-center">
              <span className="font-medium text-lg text-typography-800">{`${field.label}: `}</span>
              <div className="flex-1">
                <TextField
                  value={value ?? "--"}
                  onChange={e =>
                    setSummaryData(prev => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  inputStyles={{
                    color: field.isEditable ? "#1A1A1A" : "#9CA3AF",
                    fontSize: "16px",
                    fontFamily: "IBM_Plex_Serif",
                  }}
                  InputProps={{
                    readOnly: isFieldDisabled(field),
                  }}
                  showBorder={false}
                />
              </div>
            </div>
            {field.key === "clientId" && <Divider sx={{ width: "90%", marginTop: "6px" }} />}
          </div>
        );
    }
  };

  const hasDataChanged = () => {
    if (!callSummary?.details?.summary || !summaryData) {
      return false;
    }

    const originalTags = callSummary.details.summary.tags;
    const originalFormattedTags = originalTags?.map(({ tag }) => tag).join(", ");

    // Compare the formatted data with the original API response
    const originalData = {
      ...callSummary.details.summary,
      tags: originalFormattedTags,
    };

    // Deep comparison of the data
    const originalKeys = Object.keys(originalData);
    const currentKeys = Object.keys(summaryData);

    if (originalKeys.length !== currentKeys.length) {
      return true;
    }

    for (const key of originalKeys) {
      if (originalData[key] !== summaryData[key]) {
        return true;
      }
    }

    return false;
  };

  const navigateToCallLogs = () => {
    navigate(ROUTES.CALLS, { state: { refetch: true } });
  };

  const handleSave = async () => {
    if (hasDataChanged()) {
      const tags = summaryData?.tags?.split(", ");
      let tagsInput: Tag[] = [];
      if (tags?.length > 0) {
        const response = await getTags({ tags });
        if (response.error) {
          logger.info(`Error getting tags: ${response.error}`);
        } else if (response.data) {
          tagsInput = response.data;
        }
      }
      try {
        await updateCallSummary({
          chatId,
          data: { summary: { ...summaryData, tags: tagsInput } },
        });
      } catch (error) {
        logger.info(`Error updating call summary:, ${error}`);
      }
    }
    postProcess?.();
    if (!isInSidebar && shouldAllowEdit) {
      if (callSummary?.details?.callInfo?.isSummaryFeedbackAdded) {
        navigateToCallLogs();
      } else {
        setShowFeedbackDialog(true);
      }
    }
    return;
  };

  const debouncedUpdateNotes = useDebounce((notes: string) => {
    updateCallSummaryNotes({
      chatId: chatId.toString(),
      notes,
    });
  }, 500);

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    debouncedUpdateNotes(newNotes);
  };

  const onSubmitFeedback = () => {
    setShowFeedbackDialog(false);
    navigateToCallLogs();
  };

  if (canShowSummary && isSummaryLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <CircularProgress />
      </div>
    );
  }

  if (summaryLoadingError) {
    return (
      <div className="flex h-[90vh] items-center justify-center">
        <FallbackUI
          icon={<PageNotFoundIllustration />}
          mainMessage={t("summary.notFoundTitle")}
          description={t("summary.notFoundDesc")}
          button={{
            text: t("summary.goHome"),
            onClick: () => navigate(ROUTES.HOME),
          }}
        />
      </div>
    );
  }

  if (canShowSummary && callSummary?.details?.summary) {
    return (
      <>
        <InfoBanner
          message={t("summary.disclaimer")}
          icon={() => (
            <Warning className="border-[#EC930F] border-[0.5px] rounded-[100px] p-2 w-8 h-8 shadow-lg" />
          )}
          wrapperClassName="border-[#EC930F] bg-[#FDF8E4]"
          messageClassName="text-[#873200]"
        />
        {headerContent}
        <div className={`overflow-y-auto font-primary pb-[60px] ${className}`}>
          {sections.map(({ title, icon, key }, index) => {
            const sectionFields = getSectionFields(key, visibleFields, translatedFields);
            if (sectionFields?.length === 0) return null;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                  ease: "easeOut",
                }}
              >
                <Accordion
                  title={title}
                  titleIcon={icon}
                  defaultExpanded={[
                    SummarySectionKey.FeaturesAndDemographics,
                    SummarySectionKey.SessionSummary,
                  ]?.includes(key)}
                >
                  {sectionFields.map(field => getFieldDisplay(field))}
                </Accordion>
              </motion.div>
            );
          })}
          {/* TO DO: For now Additional Notes is not conditionally rendered, because it is not generated by the AI( and not involved in config).
          In future, we will conditionally render this accordion based on the notes field */}
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: ((sections?.length ?? 0) + 1) * 0.1,
              ease: "easeOut",
            }}
          >
            <Accordion
              key="notes"
              title={t("summary.additionalNotes")}
              titleIcon={{ icon: Assessment, alt: "Notes" }}
              defaultExpanded={false}
            >
              <div className="text-lg font-primary text-typography-800 mb-[8px]">
                {callSummary?.details?.callInfo?.notes || "--"}
              </div>
            </Accordion>
          </motion.div>
        </div>

        {shouldAllowEdit && (
          <div className="flex justify-center">
            <Button onClick={handleSave} disabled={isLoading || (isInSidebar && !hasDataChanged())}>
              {isUpdateLoading || isGetTagsLoading ? t("summary.saving") : t("summary.save")}
            </Button>
          </div>
        )}
        <FeedbackDialog
          id={chatId}
          open={showFeedbackDialog}
          sessionType={SessionType.CALL}
          onClose={onSubmitFeedback}
        />
      </>
    );
  }

  const retriggerSummary = async () => {
    setCanShowSummary(false);
    const result = await refetchSummary();
    if (
      [ChatSummaryStatus.PENDING, ChatSummaryStatus.IN_PROGRESS].includes(
        result?.data?.summaryStatus,
      )
    ) {
      toast.warning("The summary isn't available yet. It will be available shortly.");
    }
  };

  const onViewCallLogs = () => {
    navigateToCallLogs();
  };

  return (
    <SummaryLoading
      summaryStatus={callSummary?.summaryStatus}
      estimatedTime={getEstimatedSummaryGenerationTime(
        callSummary?.details?.callDuration,
        callSummary?.details?.callInfo?.provider,
      )}
      isNotesSaving={isUpdateNotesLoading}
      onNotesChange={handleNotesChange}
      onViewCallLogs={onViewCallLogs}
      notes={notes}
      refetchSummary={retriggerSummary}
      inSummarySidebar={isInSidebar}
    />
  );
};

export default CallSummary;
