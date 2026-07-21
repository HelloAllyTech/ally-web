import { FC, useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logger, Loading, Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useGetSummaryFieldsQuery,
  useUpdateCallSummaryMutation,
  useRetrySummaryMutation,
  useGetTagsMutation,
  useGetLocationsQuery,
  useLazySearchLocationsQuery,
  useUpdateCallSummaryNotesMutation,
  useGetCustomFieldValuesQuery,
  useUpsertCustomFieldValuesMutation,
} from "@api";
import { Assessment, PageNotFoundIllustration, Warning } from "@assets";
import { Accordion, Button, InfoBanner, FallbackUI } from "@components";
import { LanguageMap, Permissions, ROUTES } from "@constants";
import { FeedbackDialog } from "@containers";
import { useEnhance, useDebounce, useCustomFieldsEnabled } from "@hooks";
import CustomFieldValuesPanel from "@pages/calls/components/custom-fields/CustomFieldValuesPanel";
import { RootState } from "@store";
import { ChatSummaryStatus, SessionType, SummaryFieldKey, Tag } from "@types";
import { CustomFieldEditPermission, CustomFieldValue } from "@types";
import { getEstimatedSummaryGenerationTime, getFormattedDateTime, hasPermissions } from "@utils";

import { SummaryLoading } from ".";
import SummaryFieldInput from "./SummaryFieldInput";
import { getSummaryFields, getSummarySections, labelShownSections } from "../constants";
import { CallSummaryProps, FieldType, SummaryField, SummarySectionKey } from "../types";
import { getSectionFields, summaryHasChanges } from "../utils";

// TODO: Keep it outside the pages since two pages are using this componentß

const CallSummary: FC<CallSummaryProps> = ({
  chatId,
  isInSidebar = false,
  className,
  headerContent,
  postProcess,
  canEditSummary = true,
  canEditCustomFields,
  callSummary,
  onRefetchSummary,
  isSummaryLoading,
  summaryLoadingError,
  onCustomFieldValuesSaved,
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

  const { data: visibleFields, isLoading: isGetSummaryFieldsLoading } = useGetSummaryFieldsQuery(
    undefined,
    {
      skip: !hasPermissions(permissions, Permissions.VIEW_SUMMARY_FIELDS),
    },
  );
  const [updateCallSummary, { isLoading: isUpdateLoading }] = useUpdateCallSummaryMutation();
  const [retrySummary, { isLoading: isRetrying }] = useRetrySummaryMutation();
  const [getTags, { isLoading: isGetTagsLoading }] = useGetTagsMutation();
  const { data: locations, isLoading: isGetLocationsLoading } = useGetLocationsQuery();
  const [searchLocations, { isLoading: isSearchLocationsLoading }] = useLazySearchLocationsQuery();
  const [updateCallSummaryNotes, { isLoading: isUpdateNotesLoading }] =
    useUpdateCallSummaryNotesMutation();

  const { enhancing, EnhanceButton, EnhancementLoadingSkeleton, isEnhanceLoading } = useEnhance();

  // Custom field state
  const { data: customFieldsEnabled } = useCustomFieldsEnabled();
  const customFieldsActive = customFieldsEnabled !== false;
  const { data: customFieldValues } = useGetCustomFieldValuesQuery(chatId, {
    skip: !chatId || !customFieldsActive,
  });
  const [upsertCustomFieldValues] = useUpsertCustomFieldValuesMutation();
  const [customLocalValues, setCustomLocalValues] = useState<Record<string, string | null>>({});
  // Fields the user has actually edited in this visit. Saving must only ever
  // send these — diffing customLocalValues against the live customFieldValues
  // cache instead would re-include any field whose server value drifted for a
  // reason unrelated to this user (another editor, a background AI fill) and
  // silently write the stale locally-seeded value back over it.
  const [dirtyFieldIds, setDirtyFieldIds] = useState<Set<string>>(new Set());
  const seededChatIdRef = useRef<number | null>(null);

  // Seed local edit state once per chat. Re-seeding on every customFieldValues
  // change would clobber the user's in-progress edits: a background refetch
  // (window focus, polling, or a tag invalidation from another mutation) resets
  // typed values back to the stale server value before the user can save.
  useEffect(() => {
    if (customFieldValues && seededChatIdRef.current !== chatId) {
      const initial: Record<string, string | null> = {};
      customFieldValues.forEach((f: CustomFieldValue) => {
        initial[f.fieldDefinitionId] = f.value ?? null;
      });
      setCustomLocalValues(initial);
      setDirtyFieldIds(new Set());
      seededChatIdRef.current = chatId;
    }
  }, [customFieldValues, chatId]);

  const handleCustomFieldChange = (fieldDefinitionId: string, value: string | null) => {
    setCustomLocalValues(prev => ({ ...prev, [fieldDefinitionId]: value }));
    setDirtyFieldIds(prev => new Set(prev).add(fieldDefinitionId));
  };

  const hasCustomFieldsChanged = () => dirtyFieldIds.size > 0;

  // Determine if editing should be allowed
  // If canEditSummary is explicitly false (from ConsolidatedLogs), respect that
  // Otherwise (true/undefined/default), check permissions and counselor match
  const hasEditSummaryPermission = permissions?.includes(Permissions.EDIT_CALL_DETAILS);
  const isAdmin = permissions?.includes(Permissions.MANAGE_CUSTOM_FIELD_DEFINITIONS);
  const isCounsellorForCall = Boolean(
    user?.userId && callSummary?.counselorId && callSummary.counselorId === user.userId,
  );
  const shouldAllowEdit =
    canEditSummary !== false && hasEditSummaryPermission && isCounsellorForCall;
  const hasAdminEditableCustomFields =
    isAdmin &&
    customFieldsActive &&
    (customFieldValues?.some(
      (f: CustomFieldValue) =>
        f.editPermission === CustomFieldEditPermission.ADMIN_ONLY ||
        f.editPermission === CustomFieldEditPermission.BOTH,
    ) ??
      false);
  const hasCounsellorEditableCustomFields =
    isCounsellorForCall &&
    customFieldsActive &&
    (customFieldValues?.some(
      (f: CustomFieldValue) =>
        f.editPermission === CustomFieldEditPermission.COUNSELLOR_ONLY ||
        f.editPermission === CustomFieldEditPermission.BOTH,
    ) ??
      false);
  const canSave =
    shouldAllowEdit ||
    (canEditCustomFields !== false &&
      (hasAdminEditableCustomFields || hasCounsellorEditableCustomFields));

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
    } else if (callSummary?.summaryStatus === ChatSummaryStatus.FAILED) {
      // Summary generation failed but the transcript was saved. Seed whatever
      // (possibly empty) summary exists so the fields render as editable blanks
      // for manual entry, and show the form + a Retry action instead of a
      // dead-end error screen.
      const existing = callSummary.details?.summary;
      const tags = existing?.tags;
      setSummaryData({
        ...(existing ?? {}),
        tags: tags?.map(({ tag }) => tag).join(", ") ?? "",
      });
      setCanShowSummary(true);
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
      case SummaryFieldKey.Mode: {
        const mode = callSummary?.details?.callInfo?.mode || summaryData?.mode;
        return mode === "DICTATION" ? "Dictation" : "Scribe";
      }
      default:
        return summaryData[key];
    }
  };

  const isFieldDisabled = (field: SummaryField) => {
    return !field.isEditable || !shouldAllowEdit;
  };

  const getFieldDisplay = (field: SummaryField) => {
    const value = getFieldValue(field.key, field.type);
    const isEnhancing = enhancing === field.key;
    const enhanceEndAdornment =
      field.isEnhanceable && shouldAllowEdit && value && value.trim() ? (
        <Tooltip label={t("summary.enhance")} align="bottom">
          <span className="absolute bottom-2 right-2">
            <EnhanceButton
              fieldName={field.key}
              inputText={value}
              updateValue={text => setSummaryData(prev => ({ ...prev, [field.key]: text }))}
            />
          </span>
        </Tooltip>
      ) : undefined;

    return (
      <SummaryFieldInput
        key={field.key}
        field={field}
        value={value}
        disabled={isFieldDisabled(field)}
        options={
          field.type === FieldType.Dropdown
            ? getDropdownOptions(field.key, field.options)
            : undefined
        }
        showLabel={labelShownSections?.includes(field.sectionKey)}
        onChange={(key, val) => setSummaryData(prev => ({ ...prev, [key]: val }))}
        onSearch={onHandleSearch}
        isEnhancing={isEnhancing}
        enhanceStartAdornment={isEnhancing ? EnhancementLoadingSkeleton : undefined}
        enhanceEndAdornment={enhanceEndAdornment}
      />
    );
  };

  const hasDataChanged = () => summaryHasChanges(callSummary?.details?.summary, summaryData);

  const navigateToCallLogs = () => {
    navigate(ROUTES.SCRIBE_LOGS, { state: { refetch: true } });
  };

  const handleSave = async () => {
    // Track whether any persistence step failed. A failed save must NOT fall
    // through to postProcess/navigate as if it succeeded — otherwise the edit
    // only lives in local component state (the field still *looks* updated on
    // screen) while the DB, and anything that reads it like the call-logs
    // table column, keep the old value with no error shown. See handleSave's
    // two catch blocks below.
    let saveFailed = false;
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
        }).unwrap();
      } catch (error) {
        logger.info(`Error updating call summary:, ${error}`);
        saveFailed = true;
      }
    }
    if (hasCustomFieldsChanged()) {
      const changedFields = Array.from(dirtyFieldIds).map(fieldDefinitionId => ({
        fieldDefinitionId,
        // Coalesce to null, not undefined: a cleared field must be sent as an
        // explicit null so the backend overwrites it. undefined is dropped by
        // JSON.stringify, which the backend reads as "leave unchanged" and the
        // old value refills on reopen.
        value: customLocalValues[fieldDefinitionId] ?? null,
      }));
      try {
        await upsertCustomFieldValues({ chatId, values: changedFields }).unwrap();
        setDirtyFieldIds(new Set());
        // Let a parent list reflect the edit on its row immediately; the list
        // only refetches its current page, so rows elsewhere would stay stale.
        onCustomFieldValuesSaved?.(chatId, changedFields);
      } catch (error) {
        logger.info(`Error saving custom field values: ${error}`);
        saveFailed = true;
      }
    }
    if (saveFailed) {
      // Surface the failure and keep the (still-dirty) edits so the user can
      // retry, instead of silently navigating away as though the save worked.
      toast.error(t("summary.saveFailed", "Couldn't save your changes. Please try again."));
      return;
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

  const handleRetrySummary = async () => {
    try {
      const res = await retrySummary(chatId).unwrap();
      if (res?.success) {
        toast.success(t("summary.retrySuccess"));
      } else {
        toast.warning(res?.message || t("summary.retryFailed"));
      }
    } catch {
      toast.error(t("summary.retryFailed"));
    }
    // Refetch so a regenerated summary (or the still-failed state) is reflected.
    await onRefetchSummary();
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
        <Loading withOverlay={false} />
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

  const isFailedSummary = callSummary?.summaryStatus === ChatSummaryStatus.FAILED;

  // A manual note (created via "Create Note") has summaryStatus SUCCESS but no
  // AI-generated `details.summary` — there was no audio to summarise. Treat that
  // as ready-to-edit too, otherwise the panel is stuck forever on SummaryLoading's
  // "Setting up your summary screen" and the fields (incl. custom fields) never
  // render. FAILED already renders the form for manual entry; SUCCESS-with-empty
  // -summary must as well.
  const isResolvedEmptySummary = callSummary?.summaryStatus === ChatSummaryStatus.SUCCESS;

  if (
    canShowSummary &&
    (callSummary?.details?.summary || isFailedSummary || isResolvedEmptySummary)
  ) {
    return (
      <>
        {isFailedSummary ? (
          // Summary generation failed but the transcript was saved: let the
          // user retry generation or fill the fields in manually and save.
          <div className="flex items-center justify-between gap-3 rounded-md border border-[#EC930F] bg-[#FDF8E4] px-4 py-3 mb-2">
            <span className="text-[#873200] font-primary text-sm">
              {t("summary.generationFailedEditable")}
            </span>
            <Button onClick={handleRetrySummary} disabled={isRetrying} className="shrink-0">
              {isRetrying && <Loading small withOverlay={false} className="mr-2 !h-4 !w-4" />}
              {t("summary.retrySummary")}
            </Button>
          </div>
        ) : (
          <InfoBanner
            message={t("summary.disclaimer")}
            icon={() => (
              <Warning className="border-[#EC930F] border-[0.5px] rounded-[100px] p-2 w-8 h-8 shadow-lg" />
            )}
            wrapperClassName="border-[#EC930F] bg-[#FDF8E4]"
            messageClassName="text-[#873200]"
          />
        )}
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
                  {chatId && customFieldsActive && (
                    <CustomFieldValuesPanel
                      chatId={chatId}
                      canEdit={canEditCustomFields}
                      isCounsellor={isCounsellorForCall}
                      filterSectionKey={key}
                      externalFieldValues={customFieldValues ?? []}
                      externalLocalValues={customLocalValues}
                      onValueChange={handleCustomFieldChange}
                    />
                  )}
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

        {canSave && (
          <div className="flex justify-center">
            <Button
              onClick={handleSave}
              disabled={
                isLoading || (isInSidebar && !hasDataChanged() && !hasCustomFieldsChanged())
              }
            >
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
    const result = await onRefetchSummary();
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
