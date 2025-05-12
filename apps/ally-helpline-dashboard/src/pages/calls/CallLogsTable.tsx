import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress, Pagination, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { Eye } from "lucide-react";

import { RootState } from "@/store/store";
import { updatePage, updateTotalCallsCount } from "@/reducer/callsReducer";
import { useGetCallLogsQuery } from "@/api/calls";
import { FallbackUI } from "@/components";
import { NoResults } from "@/assets/icons";

import SummarySideBar from "./components/SummarySideBar";
import { convertSecondsToDuration, formatDate } from "./utils";
import { CALL_LOGS_PAGINATION_LIMIT, dummySummarydata, TABLE_HEADERS, TABLE_ROW_HEIGHT, TAG_COLORS } from "./constants";

const CallLogsTable = () => {
  const dispatch = useDispatch();

  const { filters: { page }, totalCallsCount } = useSelector((state: RootState) => state.calls);

  const [transition, setTransition] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  const { data: callLogsData, isLoading } = useGetCallLogsQuery({
    limit: CALL_LOGS_PAGINATION_LIMIT,
    offset: (page * CALL_LOGS_PAGINATION_LIMIT) - CALL_LOGS_PAGINATION_LIMIT,
  });

  const { count, data: callLogs } = callLogsData || {};

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        setTransition(false);
      }, 100);
    }
  }, [isLoading]);

  useEffect(() => {
    dispatch(updateTotalCallsCount(count));
  }, [count]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100%_-_80px)]">
        <CircularProgress />
      </div>
    );
  }

  const getDisplayData = (row: { [key: string]: any }) => {
    const { details, id, startedAt, clientId } = row;
    if (details) {
      //TODO - change default values
      const { callDuration = 30, startTime, summary, transcript } = details;

      return {
        id,
        clientId,
        dateAndTime: formatDate(startTime),
        duration: convertSecondsToDuration(callDuration ?? 60),
        quality_score: summary?.callQuality ?? 70,
        tags: summary?.tags?.map((tag: { tag: string; positivity_rating: number }) => {
          return {
            label: tag?.tag,
            capsuleColor: TAG_COLORS[tag?.positivity_rating],
          };
        }),
        keyConcerns: summary?.summaryNote?.session_documentation?.key_concerns,
        flow: summary?.summaryNote?.session_documentation?.work_done?.counseling_process_flow,
        notes: summary?.notesForNextSession,
        transcript: transcript,
      };
    }
    return {
      id,
      clientId,
      dateAndTime: formatDate(startedAt),
      duration: convertSecondsToDuration(30),
      quality_score: 0,
      tags: [].map((tag) => {
        return {
          label: tag.tag,
          capsuleColor: TAG_COLORS[tag.positivity_rating],
        };
      }),
    };
  };

  const getWidth = (percentage: number) => {
    return (percentage / 100) * 128;
  };

  return (
    <>
      <div
        className={`${callLogs.length > 0 ? "bg-white shadow-md" : ""} rounded-xl w-full`}
        style={{ minHeight: `${TABLE_ROW_HEIGHT * (CALL_LOGS_PAGINATION_LIMIT + 1)}px` }}
      >
        <Table sx={{ minWidth: "100%" }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "#F5F5F5" }}>
            <TableRow>
              {TABLE_HEADERS.map((header) => (
                <TableCell key={header.id} sx={{ width: header.width }}>{header.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {callLogs?.map((row: { [key: string]: any }, index: number) => {
              const displayData = getDisplayData(row);
              return (
                <TableRow key={displayData.id}>
                  {TABLE_HEADERS.map((header) => (
                    <TableCell key={header.id} sx={{ width: header.width, height: `${TABLE_ROW_HEIGHT}px` }}>
                      {/* TODO: Replace with a switch */}
                      {header.id === "tags" && (
                        <div className="flex gap-2">
                          {displayData.tags?.map(
                            (tag: { label: string; capsuleColor: { bg: string; text: string } }) => (
                              <div
                                key={tag.label}
                                style={{
                                  backgroundColor: tag?.capsuleColor?.bg,
                                  color: tag?.capsuleColor?.text,
                                }}
                                className="rounded-md px-2 py-1 text-white text-xs font-medium"
                              >
                                {tag.label}
                              </div>
                            )
                          )}
                        </div>
                      )}
                      {header.id === "quality_score" && (
                        <div className="flex items-center gap-3">
                          <label>{displayData.quality_score}</label>
                          <div className="flex gap-1 w-32 h-1">
                            <div
                              style={{
                                width: !transition && `${getWidth(displayData.quality_score)}px`,
                              }}
                              className="w-0 transition-all duration-300 border-[2px] border-[#6272FF] rounded-md"
                            />
                            <div
                              style={{
                                width: !transition && `${getWidth(100 - displayData.quality_score)}px`,
                              }}
                              className="w-full transition-all duration-300 border-[2px] border-t-[#E6F2FF] rounded-md"
                            />
                          </div>
                        </div>
                      )}
                      {header.id === "notes" && (
                        <Eye
                          className="text-[#868686] w-4 h-4 ml-2 cursor-pointer"
                          onClick={() => setSummary(index === 0 ? dummySummarydata : displayData)}
                        />
                      )}
                      {!["tags", "quality_score", "notes"].includes(header.id) && displayData[header.id]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-center mt-6">
        <Pagination
          count={Math.ceil(totalCallsCount / CALL_LOGS_PAGINATION_LIMIT)}
          page={page}
          onChange={(_, value) => dispatch(updatePage(value))}
          showFirstButton
          showLastButton
        />
      </div>
      {callLogs?.length === 0 && (
        <FallbackUI
          image={<NoResults />}
          mainMessage="No call records found"
          description="Your recent calls and insights will be listed here."
          className="py-[100px]"
        />
      )}
      {summary && summary?.id && (
        <SummarySideBar
          summary={summary}
          setSummary={setSummary}
        />
      )}
    </>
  );
};

export default CallLogsTable;
