import { FC, useEffect, useState } from "react";
import { Divider } from "@mui/material";
import { useSelector } from "react-redux";

import { RootState } from "@/store/store";
import { DropdownField } from "@ally-ui-mono/ui-shared";
import { Accordion, TextField, Button } from "@/components";
import {
  useGetSummaryFieldsQuery,
  useUpdateCallSummaryMutation,
  useGetTagsMutation,
  useGetLocationsQuery,
  useLazySearchLocationsQuery,
} from "@/api/callSummary";
import { useEnhance } from "@/hooks";
import { SummaryFieldKey, Tag } from "@/types/summary";
import { UserRole } from "@/types/user";
import { logger } from "@ally-ui-mono/ui-shared";

import { labelShownSections, summarySections } from "../constants";
import { CallSummaryProps, SummaryField, SummarySectionKey } from "../types";
import { getFormattedDateTime, getSectionFields } from "../helper";
import SummaryLoading from "./SummaryLoading";

const CallSummary: FC<CallSummaryProps> = ({
  callSummary,
  chatId,
  isSummaryLoading,
  onProceed,
  showInitialLoading,
  setShowInitialLoading,
  isInSidebar = false,
  className,
}) => {
  const { user } = useSelector((state: RootState) => state.user);

  const [summaryData, setSummaryData] = useState(null);
  const [searchedLocations, setSearchedLocations] = useState(null);

  const { data: visibleFields, isLoading: isGetSummaryFieldsLoading } = useGetSummaryFieldsQuery();
  const [updateCallSummary, { isLoading: isUpdateLoading }] = useUpdateCallSummaryMutation();
  const [getTags, { isLoading: isGetTagsLoading }] = useGetTagsMutation();
  const { data: locations, isLoading: isGetLocationsLoading } = useGetLocationsQuery();
  const [searchLocations, { isLoading: isSearchLocationsLoading }] = useLazySearchLocationsQuery();

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
    let timer: NodeJS.Timeout;
    if (showInitialLoading) {
      // Show loading screen
      timer = setTimeout(() => {
        setShowInitialLoading(false);
      }, 4000); // 4 seconds to allow all loading messages to appear
    }

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (callSummary?.details?.summary) {
      const tags = callSummary.details.summary?.tags;
      setSummaryData({
        ...callSummary.details.summary,
        tags: tags?.map(({ tag }) => tag).join(", "),
      });
    }
  }, [callSummary]);

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
        return `${Math.floor(Number(duration) / 60)} minutes`;
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
            ?.map(({ language, percentage }) => `${language} (${percentage}%)`)
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
              rows={4}
              className={`w-full ${isFieldDisabled(field) ? "pointer-events-none" : ""}`}
              inputStyles={{
                color: field.isEditable ? "#1A1A1A" : "#9CA3AF",
                fontSize: "16px",
                fontFamily: "IBM_Plex_Serif",
                cursor: enhancing === field.key ? "not-allowed" : "auto",
              }}
              placeholder={enhancing === field.key ? "" : field.placeholder}
              showBorder={false}
              InputProps={{
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
                  className={`${isFieldDisabled(field) ? "pointer-events-none" : ""}`}
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

  // Show loading screen only on first visit
  if (showInitialLoading) {
    return <SummaryLoading />;
  }

  return (
    <>
      <div className={`overflow-y-auto font-['IBM_Plex_Serif'] ${className}`}>
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
      </div>
      {!isAdmin && (
        <div className="flex justify-center pt-4">
          <Button
            className="rounded-[100px]"
            onClick={handleSubmit}
            disabled={isLoading || (isInSidebar && !hasDataChanged())}
          >
            {isUpdateLoading || isGetTagsLoading ? "Submitting..." : "Submit"}
          </Button>
        </div>
      )}
    </>
  );
};

export default CallSummary;
