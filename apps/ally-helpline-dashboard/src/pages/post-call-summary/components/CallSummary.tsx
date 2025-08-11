import { FC, useEffect, useState } from "react";
import { Divider } from "@mui/material";
import { useSelector } from "react-redux";

import { logger, DropdownField } from "@ally-ui-mono/ui-shared";
import { RootState } from "@store";
import { Accordion, TextField, Button } from "@components";
import {
  useGetSummaryFieldsQuery,
  useUpdateCallSummaryMutation,
  useGetTagsMutation,
  useGetLocationsQuery,
  useLazySearchLocationsQuery,
  useUpdateCallSummaryNotesMutation,
} from "@api";
import { useEnhance, useDebounce } from "@hooks";
import { SummaryFieldKey, Tag, UserRole } from "@types";
import { LanguageMap, CallProvider } from "@constants";
import { Assessment } from "@assets";

import { labelShownSections, summarySections } from "../constants";
import { CallSummaryProps, SummaryField, SummarySectionKey } from "../types";
import { getFormattedDateTime, getSectionFields } from "../helper";
import { SummaryLoading } from ".";

const CallSummary: FC<CallSummaryProps> = ({
  onClickViewSummary,
  callSummary,
  chatId,
  isSummaryLoading,
  onProceed,
  isInSidebar = false,
  isSummaryPolling = false,
  className,
  fromSummarySidebar = false,
}) => {
  const { user } = useSelector((state: RootState) => state.user);

  const initialNotes = callSummary?.details?.callInfo?.notes || "";

  const [summaryData, setSummaryData] = useState(null);
  const [searchedLocations, setSearchedLocations] = useState(null);

  const { data: visibleFields, isLoading: isGetSummaryFieldsLoading } = useGetSummaryFieldsQuery();
  const [updateCallSummary, { isLoading: isUpdateLoading }] = useUpdateCallSummaryMutation();
  const [getTags, { isLoading: isGetTagsLoading }] = useGetTagsMutation();
  const { data: locations, isLoading: isGetLocationsLoading } = useGetLocationsQuery();
  const [searchLocations, { isLoading: isSearchLocationsLoading }] = useLazySearchLocationsQuery();
  const [updateCallSummaryNotes] = useUpdateCallSummaryNotesMutation();
  const [canShowSummary, setCanShowSummary] = useState(fromSummarySidebar);
  const [notes, setNotes] = useState(initialNotes);

  const { enhancing, EnhanceButton, EnhancementLoadingSkeleton, isEnhanceLoading } = useEnhance();

  const isAdmin = user?.role === UserRole.ADMIN;
  const isLoading =
    isGetSummaryFieldsLoading ||
    isSummaryLoading ||
    isUpdateLoading ||
    isEnhanceLoading ||
    isGetTagsLoading ||
    isGetLocationsLoading ||
    isSearchLocationsLoading;

  useEffect(() => {
    if (callSummary?.details?.summary) {
      const tags = callSummary.details.summary?.tags;
      setSummaryData({
        ...callSummary.details.summary,
        tags: tags?.map(({ tag }) => tag).join(", "),
      });
    }
  }, [callSummary]);

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
      return type !== "Dropdown" ? "--" : "";
    }
    switch (key) {
      case SummaryFieldKey.CallId:
        return callSummary?.details?.chatId || summaryData.callId;
      case SummaryFieldKey.CallDuration: {
        const duration = callSummary?.details?.callDuration || summaryData.callDuration;
        return duration ? `${Math.floor(Number(duration) / 60)} minutes` : "--";
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
    return !field.isEditable || isAdmin;
  };

  const getFieldDisplay = (field: SummaryField) => {
    const value = getFieldValue(field.key, field.type);
    switch (field.type) {
      case "Dropdown":
        return (
          <div key={field.key} className="flex gap-1">
            <span className="font-medium text-[16px] text-[#6B7280]">{`${field.label}: `}</span>
            <DropdownField
              disabled={isFieldDisabled(field)}
              value={value ?? "--"}
              valueClassName={`${field.isEditable ? "text-[#1A1A1A]" : "text-[#9CA3AF]"} 
                text-[16px] font-['IBM_Plex_Serif']`}
              onChange={value => setSummaryData(prev => ({ ...prev, [field.key]: value }))}
              onHandleSearch={field.key === SummaryFieldKey.Location ? onHandleSearch : undefined}
              options={getDropdownOptions(field.key, field.options)}
            />
          </div>
        );
      case "Multiline":
        return (
          <div key={field.key} className="flex flex-col gap-1">
            {labelShownSections?.includes(field.sectionKey) && (
              <span className="font-medium text-[16px] text-[#6B7280]">{`${field.label}: `}</span>
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
                endAdornment: field.isEnhanceable && !isAdmin && (
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
                ),
              }}
            />
          </div>
        );
      case "Number":
      case "Text":
      default:
        return (
          <div key={field.key}>
            <div className="flex items-center">
              <span className="font-medium text-[16px] text-[#6B7280]">{`${field.label}: `}</span>
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

  const handleSubmit = async () => {
    // Only proceed if data has actually changed
    if (!hasDataChanged()) {
      logger.info("No changes detected in summary data, skipping update");
      onProceed();
      return;
    }

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
      onProceed();
    } catch (error) {
      logger.info(`Error updating call summary:, ${error}`);
    }
  };

  const onViewSummary = () => {
    onClickViewSummary?.();
    setCanShowSummary(true);
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

  if (canShowSummary && callSummary?.details?.summary) {
    return (
      <>
        <div className={`overflow-y-auto font-['IBM_Plex_Serif'] pb-[40px] ${className}`}>
          {summarySections.map(({ title, icon, key }) => {
            const sectionFields = getSectionFields(key, visibleFields);
            if (sectionFields?.length === 0) return null;

            return (
              <Accordion
                key={key}
                title={title}
                titleIcon={icon}
                defaultExpanded={[
                  SummarySectionKey.FeaturesAndDemographics,
                  SummarySectionKey.SessionSummary,
                ]?.includes(key)}
              >
                {sectionFields.map(field => getFieldDisplay(field))}
              </Accordion>
            );
          })}
          {/* TO DO: For now Additional Notes is not conditionally rendered, because it is not generated by the AI. In future, we will conditionally render this accordion based on the notes field */}
          <Accordion
            key="notes"
            title="Additional Notes"
            titleIcon={{ icon: Assessment, alt: "Notes" }}
            defaultExpanded={false}
          >
            <div className="text-[16px] font-['IBM_Plex_Serif'] text-[#6B7280] mb-[8px]">
              {callSummary?.details?.callInfo?.notes || "--"}
            </div>
          </Accordion>
        </div>
        {!isAdmin && (
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isLoading || (isInSidebar && !hasDataChanged())}
            >
              {isUpdateLoading || isGetTagsLoading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        )}
      </>
    );
  }

  const callProvider = callSummary?.details?.callInfo?.provider;

  return (
    <SummaryLoading
      isSummaryDelayed={
        callProvider === CallProvider.MICROPHONE ||
        callProvider === CallProvider.EXOTEL_CONFERENCE_CALL
      }
      isSummaryPolling={isSummaryPolling}
      isSummaryGenerated={callSummary?.details?.summary}
      onViewSummary={onViewSummary}
      onNotesChange={handleNotesChange}
      onViewCallLogs={onProceed}
      notes={notes}
    />
  );
};

export default CallSummary;
