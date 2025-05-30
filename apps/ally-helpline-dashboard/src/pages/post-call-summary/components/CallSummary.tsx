import { FC, useEffect, useState } from "react";
import { Divider } from "@mui/material";

import { Accordion, DropdownField, TextField, Button } from "@/components";
import {
  useGetSummaryFieldsQuery,
  useUpdateCallSummaryMutation,
  useGetTagsMutation,
  useGetLocationsQuery,
} from "@/api/callSummary";
import { useEnhance } from "@/hooks";
import { SummaryFieldKey } from "@/types/summary";

import { labelShownSections, summarySections } from "../constants";
import { CallSummaryProps, SummaryField } from "../types";
import { getFormattedDateTime, getSectionFields } from "../helper";
import SummaryLoading from "./SummaryLoading";

const CallSummary: FC<CallSummaryProps> = ({
  callSummary,
  chatId,
  isSummaryLoading,
  onProceed,
  showInitialLoading,
  setShowInitialLoading,
}) => {
  const [summaryData, setSummaryData] = useState(null);

  const { data: visibleFields, isLoading: isGetSummaryFieldsLoading } = useGetSummaryFieldsQuery();
  const [updateCallSummary, { isLoading: isUpdateLoading }] = useUpdateCallSummaryMutation();
  const [getTags, { isLoading: isGetTagsLoading }] = useGetTagsMutation();
  const { data: locations, isLoading: isGetLocationsLoading } = useGetLocationsQuery();

  const { enhancing, EnhanceButton, EnhancementLoadingSkeleton, isEnhanceLoading } = useEnhance();

  const isLoading = isGetSummaryFieldsLoading || isSummaryLoading || isUpdateLoading || isEnhanceLoading 
    || isGetTagsLoading || isGetLocationsLoading;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showInitialLoading) {
      // Show loading screen
      timer = setTimeout(() => {
        setShowInitialLoading(false);
      }, 10000); // 10 seconds to allow all loading messages to appear
    }

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (callSummary?.details?.summary) {
      const tags = callSummary.details.summary.tags;
      setSummaryData({ ...callSummary.details.summary, tags: tags.map(({ tag }) => tag).join(", ") });
    }
  }, [callSummary]);

  const getDropdownOptions = (key: string, options: string[]) => {
    if (key === SummaryFieldKey.Location) {
      return locations?.data.map(({ city }) => city) || [];
    }
    return options ?? [];
  };

  const getFieldValue = (key: string, type: string) => {
    if (!summaryData) {
      return type !== "Dropdown" ? "--" : "";
    }
    switch (key) {
      case "callId":
        return  callSummary?.details?.chatId || summaryData.callId;
      case "callDuration": {
        const duration = callSummary?.details?.callDuration || summaryData.callDuration;
        return `${Math.floor(Number(duration) / 60)} minutes`;
      }
      case "callDate":
        return getFormattedDateTime(callSummary?.details?.callDate, "do MMMM yyyy");
      case "callTime": {
        return `${getFormattedDateTime(callSummary?.startedAt, "HH:mm")} - ${
          getFormattedDateTime(callSummary?.endedAt, "HH:mm")}`;
      }
      case "clientId":
        return callSummary?.clientId || summaryData.clientId;
      case "languages":
        return summaryData.languages?.map(({ language, percentage }) => `${language} (${percentage}%)`).join(", ") || "";
      default:
        return summaryData[key];
    }
  };

  const getFieldDisplay = (field: SummaryField) => {
    const value = getFieldValue(field.key, field.type);
    switch (field.type) {
      case "Dropdown":
        return (
          <div key={field.key} className="flex gap-1">
            <span className="font-medium text-[16px] text-[#6B7280]">{`${field.label}: `}</span>
            <DropdownField
              disabled={!field.isEditable}
              value={value ?? "--"}
              valueClassName={`${field.isEditable ? "text-[#1A1A1A]" : "text-[#9CA3AF]"} text-[16px]`}
              onChange={(value) => setSummaryData((prev) => ({ ...prev, [field.key]: value }))}
              options={getDropdownOptions(field.key, field.options)}
            />
          </div>
        );
      case "Multiline":
        return (
          <div key={field.key} className="flex flex-col gap-1">
            {labelShownSections.includes(field.sectionKey) && (
              <span className="font-medium text-[16px] text-[#6B7280]">{`${field.label}: `}</span>
            )}
            <TextField
              value={enhancing === field.key ? "" : value}
              onChange={(e) => setSummaryData((prev) => ({ ...prev, [field.key]: e.target.value }))}
              multiline
              rows={4}
              className={`w-full ${field.isEditable ? "" : "pointer-events-none"}`}
              inputStyles={{ color: field.isEditable ? "#1A1A1A" : "#9CA3AF", fontSize: "16px" }}
              placeholder={field.placeholder}
              showBorder={false}
              slotProps={{
                input: {
                  startAdornment: enhancing === field.key && EnhancementLoadingSkeleton,
                  endAdornment: (
                    <EnhanceButton
                      fieldName={field.key}
                      inputText={value}
                      // TODO: update updateValue to handle Tags
                      updateValue={(text) => setSummaryData((prev) => ({ ...prev, [field.key]: text }))}
                    />
                  )
                }
              }}
            />
          </div>
        );
      case "Number":
      case "Text":
      default:
        return (
          <>
            <div key={field.key} className="flex items-center">
              <span className="font-medium text-[16px] text-[#6B7280]">{`${field.label}: `}</span>
              <TextField
                className={field.isEditable ? "" : "pointer-events-none"}
                value={value ?? "--"}
                onChange={(e) => setSummaryData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                inputStyles={{ color: field.isEditable ? "#1A1A1A" : "#9CA3AF", fontSize: "16px" }}
                showBorder={false}
              />
            </div>
            {field.key === "clientId" && (
              <Divider sx={{ width: "90%", marginTop: "6px" }} />
            )}
          </>
        );
    }
  };

  const handleSubmit = async () => {
    try {
      const tagsInput = summaryData.tags.split(", ");
      const tags = await getTags({ tags: tagsInput});
      await updateCallSummary({ chatId, data: { summary: { ...summaryData, tags: tags.data } } });
      onProceed();
    } catch (error) {
      console.error("Error updating call summary:", error);
    }
  };

  // Show loading screen only on first visit
  if (showInitialLoading) {
    return <SummaryLoading />;
  }

  return (
    <>
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {summarySections.map(({ title, icon, key }) => {
          const sectionFields = getSectionFields(key, visibleFields);
          if (sectionFields.length === 0) return null;

          return (
            <Accordion
              key={key}
              title={title}
              titleIcon={icon}
            >
              {sectionFields.map((field) => getFieldDisplay(field))}
            </Accordion>
          );
        })}
      </div>
      <div className="flex justify-center">
        <Button
          className="rounded-[100px]"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isUpdateLoading || isGetTagsLoading ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </>
  );
};

export default CallSummary;
