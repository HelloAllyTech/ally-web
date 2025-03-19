/* eslint-disable max-len */
import { FC, useState } from "react";
import { format } from "date-fns";
import { useParams } from "react-router-dom";

import { Button } from "@/components";
import { CallSummaryProps } from "../types";
import { useUpdateCallSummaryMutation } from "../api";

const CallSummaryStep: FC<CallSummaryProps> = ({ onProceed, summaryData }) => {
  const { chatId } = useParams();

  const [data, setData] = useState<typeof summaryData>(summaryData);

  const { details } = data;
  const {
    session_details: sessionDetails,
    demographic_details: demogs,
    session_documentation: sessionDocs,
  } = details?.summary?.summaryNote || {};

  const getFormattedDateTime = (dateTime: string, formatString: string) => {
    const date = new Date(dateTime);
    return format(date, formatString);
  };

  const [updateCallSummary, { isLoading }] = useUpdateCallSummaryMutation();

  const handleSubmit = () => {
    updateCallSummary({ chatId, data});
    onProceed();
  };

  return (
    <>
      <span className="text-base font-medium text-[#47464F]">Call summary</span>
      <div className="flex flex-col gap-4 text-[14px] text-[#79747E]">
        {/* Call Details */}
        <div>
          <span className="font-semibold">Call Details</span>
          <div className="mt-2 p-[12px] grid grid-cols-2 gap-2 border border-[#E5E7EB] bg-[#FAFAFA] rounded-sm">
            <div>
              <span>{"Call date: "}</span>
              <span>{getFormattedDateTime(summaryData?.startedAt, "do MMMM yyyy")}</span>
            </div>
            <div>
              <span>{"Caller type: "}</span>
              <span>{sessionDetails?.new_call_follow_up}</span>
            </div>
            <div>
              <span>{"Call time: "}</span>
              <span>{`${getFormattedDateTime(summaryData?.startedAt, "HH:mm")} - ${getFormattedDateTime(summaryData?.endedAt, "HH:mm")}`}</span>
            </div>
            <div>
              <span>{`Counsellor Name: ${sessionDetails?.counselor_name}`}</span>
            </div>
          </div>
        </div>

        {/* Demogs */}
        <div>
          <span className="font-semibold">Demogs</span>
          <div className="mt-2 p-[12px] grid grid-cols-3 gap-2 border border-[#E5E7EB] bg-[#FAFAFA] rounded-sm">
            <span>
              <span>{"Caller ID: "}</span>
              <span>{summaryData?.clientId}</span>
            </span>
            <span>
              <span>{"Age: "}</span>
              <input type="number" value={demogs?.age} />
              {/* TODO: dropdown to display and select age */}
            </span>
            <span>
              <span>{"Profession: "}</span>
              <input type="text" value={demogs?.working_status} />
              {/* TODO: dropdown to display and select profession */}
            </span>
            <span>
              <span>{"Gender: "}</span>
              <input type="text" value={demogs?.gender} />
              {/* TODO: dropdown to display and select gender */}
            </span>
            <span>
              <span>{"Location: "}</span>
              <input type="text" value={demogs?.location} />
              {/* TODO: dropdown to display and select location */}
            </span>
            <span>{`Formal diagnosis: ${demogs?.any_formal_diagnosis}`}</span>
            <span>{`Concern code: ${demogs?.code_of_concern}`}</span>
          </div>
        </div>

        {/* Key Concerns */}
        <div>
          <span className="font-semibold">Key Concerns</span>
          <div className="mt-2 p-[12px] border border-[#E5E7EB] bg-[#FAFAFA] rounded-sm">
            <ul className="list-disc list-inside">
              {sessionDocs?.key_concerns?.map((concern) => (
                <li key={concern}>{concern}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Flow */}
        <div>
          <span className="font-semibold">Flow</span>
          <div className="mt-2 p-[12px] border border-[#E5E7EB] bg-[#FAFAFA] rounded-sm">
            <ul className="list-disc list-inside">
              {sessionDocs?.work_done?.counseling_process_flow?.map((flow) => (
                <li key={flow}>{flow}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Notes for next call */}
        <div>
          <span className="font-semibold">Notes for next call</span>
          <textarea className="mt-2 p-[12px] border border-[#E5E7EB] bg-[#FAFAFA] rounded-sm w-full" />
        </div>
      </div>
      <Button onClick={handleSubmit} className="rounded-full w-fit self-end">
        Submit
      </Button>
    </>
  );
};

export default CallSummaryStep;
