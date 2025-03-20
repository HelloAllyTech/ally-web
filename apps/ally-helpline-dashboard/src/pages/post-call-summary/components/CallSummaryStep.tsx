/* eslint-disable max-len */
import { format } from "date-fns";
import { WandSparkles } from "lucide-react";
import { useParams } from "react-router-dom";
import { FC, useEffect, useState } from "react";
import { TextField, Skeleton } from "@mui/material";

import { Button, Dropdown } from "@/components";
import { CallSummaryProps, Gender } from "../types";
import {
  useEnhanceContentMutation,
  useUpdateCallSummaryMutation,
} from "../api";

const CallSummaryStep: FC<CallSummaryProps> = ({ onProceed, summaryData }) => {
  const { chatId } = useParams();

  const [data, setData] = useState<typeof summaryData>();
  const [isEnhancing, setIsEnhancing] = useState({
    key_concerns: false,
    flow: false,
    notes: false,
  });
  const [isStreaming, setIsStreaming] = useState({
    key_concerns: false,
    flow: false,
    notes: false,
  });

  const { details } = summaryData;
  const { session_details: sessionDetails, demographic_details: demogs } =
    details?.summary?.summaryNote || {};

  useEffect(() => {
    if (
      summaryData &&
      summaryData.details &&
      summaryData.details.summary?.summaryNote?.demographic_details
    ) {
      const demogs =
        summaryData.details.summary?.summaryNote?.demographic_details;
      const sessionDocs =
        summaryData.details.summary?.summaryNote?.session_documentation;

      setData({
        age: demogs.age,
        working_status: demogs.working_status,
        gender: demogs.gender,
        location: demogs.location,
        key_concerns: sessionDocs?.key_concerns,
        flow: sessionDocs?.work_done?.counseling_process_flow,
      });
    }
  }, [summaryData]);

  const getFormattedDateTime = (dateTime: string, formatString: string) => {
    const date = new Date(dateTime);
    return format(date, formatString);
  };

  const [updateCallSummary, { isLoading }] = useUpdateCallSummaryMutation();
  const [enhanceContent, { isLoading: isEnhanceLoading }] =
    useEnhanceContentMutation();

  const handleChange = (key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const triggerEnhanceApi = async (key: string) => {
    setIsEnhancing((prev) => ({ ...prev, [key]: true }));
    const response = await enhanceContent({ content: data?.[key] });

    // Simulating API response - replace with actual API call
    const updatedValue = response?.data?.enhanced_content;
    let currentIndex = 0;
    setData((prev) => ({ ...prev, [key]: "" }));
    // Create streaming effect by updating text gradually
    setIsStreaming((prev) => ({ ...prev, [key]: true }));
    setIsEnhancing((prev) => ({ ...prev, [key]: false }));
    const streamInterval = setInterval(() => {
      if (currentIndex <= updatedValue?.length) {
        setData((prev) => ({
          ...prev,
          [key]: updatedValue.slice(0, currentIndex),
        }));
        currentIndex = currentIndex + 3;
      } else {
        setData((prev) => ({ ...prev, [key]: updatedValue }));
        setIsStreaming((prev) => ({ ...prev, [key]: false }));
        clearInterval(streamInterval);
      }
    }, 50);
  };

  const handleSubmit = async () => {
    try {
      // Format data to match the expected API structure
      const formattedData = {
        callDetails: {
          ...summaryData.details.summary,
          summaryNote: {
            ...summaryData.details.summary.summaryNote,
            demographic_details: {
              ...summaryData.details.summary?.summaryNote?.demographic_details,
              age: data?.age,
              working_status: data?.working_status,
              gender: data?.gender,
              location: data?.location,
            },
            session_documentation: {
              ...summaryData.details.summary?.summaryNote
                ?.session_documentation,
              // key_concerns: data?.key_concerns?.split("\n").map((concern) => concern.replace("- ", "")),
              key_concerns: data?.key_concerns,
              work_done: {
                ...summaryData.details.summary?.summaryNote
                  ?.session_documentation?.work_done,
                // counseling_process_flow: data?.flow?.split("\n").map((flow) => flow.replace("- ", "")),
                counseling_process_flow: data?.flow,
              },
              notes_for_next_session: data?.notes,
            },
          },
        },
      };

      await updateCallSummary({ chatId, data: formattedData });
      onProceed();
    } catch (error) {
      console.error("Error submitting data:", error);
    }
  };

  const EnhanceButton: FC<{ fieldName: string }> = ({ fieldName }) => (
    <div
      className={`absolute bottom-2 right-2 ${
        isEnhancing[fieldName] || isStreaming[fieldName]
          ? "opacity-50 pointer-events-none"
          : ""
      }`}
      onClick={() => triggerEnhanceApi(fieldName)}
    >
      <div className="bg-[#E5EFFE] rounded-sm p-2 cursor-pointer">
        <WandSparkles className="text-[#046BE0]" size={20} />
      </div>
    </div>
  );

  const EnhancementLoadingSkeleton = (
    <div className="w-full">
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>
  );

  const isButtonDisabled =
    isLoading ||
    isEnhanceLoading ||
    isEnhancing.key_concerns ||
    isEnhancing.flow ||
    isEnhancing.notes ||
    isStreaming.key_concerns ||
    isStreaming.flow ||
    isStreaming.notes;

  return (
    <>
      <span className="text-base font-medium text-[#47464F]">Call summary</span>
      <div className="h-[calc(100vh-320px)] overflow-y-auto flex flex-col gap-4 text-[14px] text-[#79747E]">
        {/* Call Details */}
        <div>
          <span className="font-semibold">Call Details</span>
          <div className="mt-2 p-[12px] grid grid-cols-2 gap-2 border border-[#E5E7EB] bg-[#FAFAFA] rounded-sm">
            <div>
              <span className="font-semibold">{"Call date: "}</span>
              <span>
                {getFormattedDateTime(summaryData?.startedAt, "do MMMM yyyy")}
              </span>
            </div>
            <div>
              <span className="font-semibold">{"Caller type: "}</span>
              <span>{sessionDetails?.new_call_follow_up}</span>
            </div>
            <div>
              <span className="font-semibold">{"Call time: "}</span>
              <span>{`${getFormattedDateTime(summaryData?.startedAt, "HH:mm")} - ${getFormattedDateTime(summaryData?.endedAt, "HH:mm")}`}</span>
            </div>
            <div>
              <span className="font-semibold">{"Counsellor Name: "}</span>
              <span>{sessionDetails?.counselor_name}</span>
            </div>
          </div>
        </div>

        {/* Demogs */}
        <div>
          <span className="font-semibold">Demogs</span>
          <div className="mt-2 p-[12px] grid grid-cols-3 gap-2 border border-[#E5E7EB] bg-[#FAFAFA] rounded-sm">
            <span>
              <span className="font-semibold">{"Caller ID: "}</span>
              <span>{summaryData?.clientId}</span>
            </span>
            <span>
              <span className="font-semibold">{"Age: "}</span>
              <input
                value={data?.age}
                className="border border-[#E5E7EB] rounded-[3px] p-1 text-black"
                onChange={(e) => handleChange("age", e.target.value)}
              />
            </span>
            <span>
              <span className="font-semibold">{"Profession: "}</span>
              <input
                value={data?.working_status}
                className="border border-[#E5E7EB] rounded-[3px] p-1 text-black"
                onChange={(e) => handleChange("working_status", e.target.value)}
              />
            </span>
            <span>
              <span className="font-semibold">{"Gender: "}</span>
              <Dropdown
                value={data?.gender || ""}
                options={Object.values(Gender)}
                onChange={(value) => handleChange("gender", value)}
                minWidth={180}
                sx={{ height: 32 }}
              />
            </span>
            <span>
              <span className="font-semibold">{"Location: "}</span>
              <input
                type="text"
                value={data?.location}
                className="border border-[#E5E7EB] rounded-[3px] p-1 text-black"
                onChange={(e) => handleChange("location", e.target.value)}
              />
            </span>
            <span>
              <span className="font-semibold">{"Formal diagnosis: "}</span>
              <span>{demogs?.any_formal_diagnosis}</span>
            </span>
            <span>
              <span className="font-semibold">{"Concern code: "}</span>
              <span>{demogs?.code_of_concern}</span>
            </span>
          </div>
        </div>

        {/* Key Concerns */}
        <div>
          <span className="font-semibold">Key Concerns</span>
          <TextField
            rows={4}
            multiline
            id="outlined-multiline-static"
            onChange={(e) => handleChange("key_concerns", e.target.value)}
            value={isEnhancing.key_concerns ? "" : data?.key_concerns}
            disabled={isEnhancing.key_concerns || isStreaming.key_concerns}
            className="mt-2 border border-[#E5E7EB] rounded-sm w-full"
            sx={{
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "#000000",
              },
            }}
            slotProps={{
              input: {
                endAdornment: <EnhanceButton fieldName="key_concerns" />,
                startAdornment:
                  isEnhancing.key_concerns && EnhancementLoadingSkeleton,
              },
            }}
          />
        </div>

        {/* Flow */}
        <div>
          <span className="font-semibold">Flow</span>
          <TextField
            rows={4}
            multiline
            value={isEnhancing.flow ? "" : data?.flow}
            id="outlined-multiline-static"
            onChange={(e) => handleChange("flow", e.target.value)}
            className="mt-2 border border-[#E5E7EB] rounded-sm w-full"
            disabled={isEnhancing.flow || isStreaming.flow}
            sx={{
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "#000000",
              },
            }}
            slotProps={{
              input: {
                endAdornment: <EnhanceButton fieldName="flow" />,
                startAdornment: isEnhancing.flow && EnhancementLoadingSkeleton,
              },
            }}
          />
        </div>

        {/* Notes for next call */}
        <div>
          <span className="font-semibold">Notes for next call</span>
          <TextField
            rows={4}
            multiline
            id="outlined-multiline-static"
            value={isEnhancing.notes ? "" : data?.notes}
            disabled={isEnhancing.notes || isStreaming.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            className="mt-2 border border-[#E5E7EB] rounded-sm w-full"
            sx={{
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "#000000",
              },
            }}
            slotProps={{
              input: {
                endAdornment: <EnhanceButton fieldName="notes" />,
                startAdornment: isEnhancing.notes && EnhancementLoadingSkeleton,
              },
            }}
          />
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isButtonDisabled}
        className="rounded-full w-fit self-end"
      >
        Submit
      </Button>
    </>
  );
};

export default CallSummaryStep;
