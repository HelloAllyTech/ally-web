import { FC, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Divider } from "@mui/material";

import { Accordion, DropdownField, TextField, Button } from "@/components";
import { useGetCallSummaryQuery, useGetSummaryFieldsQuery, useUpdateCallSummaryMutation } from "@/api/callSummary";
import { useEnhance } from "@/hooks";
import { SummaryFieldKey } from "@/types/summary";

import { labelShownSections, summarySections } from "../constants";
import { CallSummaryProps, SummaryField } from "../types";
import { getFormattedDateTime, getSectionFields } from "../helper";

const CallSummary: FC<CallSummaryProps> = ({ onProceed }) => {
  const { chatId } = useParams();

  const [summaryData, setSummaryData] = useState(null);

  const { data: visibleFields, isLoading: isGetSummaryFieldsLoading } = useGetSummaryFieldsQuery();
  const { data: callSummary, refetch, isLoading: isGetCallSummaryLoading } = useGetCallSummaryQuery(chatId);
  const [updateCallSummary, { isLoading: isUpdateLoading }] = useUpdateCallSummaryMutation();

  const { enhancing, EnhanceButton, EnhancementLoadingSkeleton, isEnhanceLoading } = useEnhance();

  const isLoading = isGetSummaryFieldsLoading || isGetCallSummaryLoading || isUpdateLoading || isEnhanceLoading;

  useEffect(() => {
    const refetchCallSummary = async () => {
      try {
        if (!callSummary?.details) {
          await refetch();
        }
      } catch (error) {
        console.error("Error fetching call summary:", error);
      }
    };

    let interval: NodeJS.Timeout;

    if (!callSummary?.details?.summary) {
      refetchCallSummary();
      interval = setInterval(refetchCallSummary, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [callSummary]);

  useEffect(() => {
    if (callSummary?.details?.summary) {
      setSummaryData(callSummary.details.summary);
    }
  }, [callSummary]);

  const getFieldValue = (key: string, type: string) => {
    if (!summaryData) {
      return type === "Text" ? "--" : "";
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
      case "tags":
        return summaryData.tags?.map((tag) => tag.tag).join(", ") || "";
      default:
        return summaryData[key];
    }
  };

  const onMultilineChange = (key: string, value: string) => {
    // TODO: update onChange to handle Tags
    // if (key === SummaryFieldKey.Tags) {
    //   console.log(value);
    //   setSummaryData((prev) => ({ ...prev, [key]:  }));
    // }
    setSummaryData((prev) => ({ ...prev, [key]: value }));
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
              value={value}
              valueClassName={`${field.isEditable ? "text-[#1A1A1A]" : "text-[#9CA3AF]"} text-[16px]`}
              onChange={(value) => setSummaryData((prev) => ({ ...prev, [field.key]: value }))}
              options={field.options ?? []}
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
              onChange={(e) => onMultilineChange(field.key, e.target.value)}
              multiline
              rows={4}
              className={`w-full ${field.isEditable ? "" : "pointer-events-none"}`}
              inputStyles={{ color: field.isEditable ? "#1A1A1A" : "#9CA3AF", fontSize: "16px" }}
              placeholder={field.placeholder}
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
                value={value}
                onChange={(e) => setSummaryData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                inputStyles={{ color: field.isEditable ? "#1A1A1A" : "#9CA3AF", fontSize: "16px" }}
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
      await updateCallSummary({ chatId, data: { summary: summaryData } });
      onProceed();
    } catch (error) {
      console.error("Error updating call summary:", error);
    }
  };

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
          {isUpdateLoading ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </>
  );
};

export default CallSummary;
