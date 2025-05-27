import { FC, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { Accordion, DropdownField, TextField, Button } from "@/components";
import { useGetCallSummaryQuery, useGetSummaryFieldsQuery, useUpdateCallSummaryMutation } from "@/api/callSummary";

import { labelShownSections, summaryFields, summarySections } from "../constants";
import { CallSummaryProps, SummaryField } from "../types";
import { getFormattedDateTime } from "../helper";

const CallSummary: FC<CallSummaryProps> = ({ onProceed }) => {
  const { chatId } = useParams();

  const [editingField, setEditingField] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState(null);

  const { data: visibleFields } = useGetSummaryFieldsQuery();
  const { data: callSummary, refetch } = useGetCallSummaryQuery(chatId);
  const [updateCallSummary, { isLoading: isUpdateLoading }] = useUpdateCallSummaryMutation();

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

  const handleEditableFieldClick = (field: SummaryField) => {
    if (field.isEditable) {
      setEditingField(field.key);
    }
  };

  const getFieldValue = (key: string, type: string) => {
    if (!summaryData) {
      return type === "Text" ? "--" : "";
    }
    switch (key) {
      case "callId":
        return summaryData.callId || callSummary?.details?.chatId;
      case "callDuration": {
        const duration = summaryData.callDuration || callSummary?.details?.callDuration;
        return `${Math.floor(Number(duration) / 60)} minutes`;
      }
      case "callDate":
        return getFormattedDateTime(callSummary?.details?.callDate, "do MMMM yyyy");
      case "callTime": {
        return `${getFormattedDateTime(callSummary?.startedAt, "HH:mm")} 
          - ${getFormattedDateTime(callSummary?.endedAt, "HH:mm")}`;
      }
      case "clientId":
        return summaryData.clientId || callSummary?.clientId;
      case "dominantFeelings":
        return summaryData.dominantFeelings.join(",\n") || "";
      case "tags":
        return summaryData.tags.map((tag) => tag.tag).join(", ") || "";
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
            <span className="font-medium text-[16px] text-[#000]">{`${field.label}: `}</span>
            <DropdownField
              value={value}
              onChange={(value) => setSummaryData((prev) => ({ ...prev, [field.key]: value }))}
              options={field.options ?? []}
            />
          </div>
        );
      case "Multiline":
        return (
          <div key={field.key} className="flex flex-col gap-1">
            {labelShownSections.includes(field.sectionKey) && (
              <span className="font-medium text-[16px] text-[#000]">{`${field.label}: `}</span>
            )}
            <TextField
              value={value}
              onChange={(e) => setSummaryData((prev) => ({ ...prev, [field.key]: e.target.value }))}
              multiline
              rows={4}
              className="w-full text-[16px]"
              placeholder={field.placeholder}
            />
          </div>
        );
      case "Number":
      case "Text":
      default:
        return editingField === field.key ? (
          <div key={field.key}>
            <span className="font-medium text-[16px] text-[#1D1B20]">{`${field.label}: `}</span>
            <input
              type="text"
              value={value}
              onBlur={() => setEditingField(null)}
              onChange={(e) => setSummaryData((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="text-[16px]"
            />
          </div>
        ) : (
          <div key={field.key}>
            <span className="font-medium text-[16px] text-[#1D1B20]">{`${field.label}: `}</span>
            <span
              className={`${field.isEditable ? "text-[#000] cursor-pointer" : "text-gray-500"} text-[16px]`}
              onClick={() => handleEditableFieldClick(field)}
            >
              {value}
            </span>
          </div>
        );
    }
  };

  const getSectionFields = (section: string) => {
    return summaryFields.filter((field) => field.sectionKey === section && visibleFields?.includes(field.key));
  };

  const handleSubmit = async () => {
    try {
      await updateCallSummary({ chatId, data: summaryData });
      onProceed();
    } catch (error) {
      console.error("Error updating call summary:", error);
    }
  };

  return (
    <>
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {summarySections.map(({ title, icon, key }) => (
          <Accordion
            key={key}
            title={title}
            titleIcon={icon}
          >
            {getSectionFields(key).map((field) => getFieldDisplay(field))}
          </Accordion>
        ))}
      </div>
      <div className="flex justify-center">
        <Button
          className="rounded-[100px]"
          onClick={handleSubmit}
          disabled={isUpdateLoading}
        >
          {isUpdateLoading ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </>
  );
};

export default CallSummary;
