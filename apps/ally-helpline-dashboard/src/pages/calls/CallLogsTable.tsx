import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CircularProgress,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { Eye } from 'lucide-react';

import { RootState } from '@/store/store';
import { updatePage, updateTotalCallsCount } from '@/reducer/callsReducer';
import { useGetCallLogsQuery } from '@/api/calls';
import { FallbackUI } from '@/components';
import { NoResults } from '@/assets/icons';
import { CallLog } from '@/types/calls';

import SummarySideBar from './components/SummarySideBar';
import { convertSecondsToDuration, formatDate } from './utils';
import {
  CALL_LOGS_PAGINATION_LIMIT,
  tableHeaders,
  TABLE_ROW_HEIGHT,
  tagColors,
} from './constants';
import { TagDisplay } from './types';

const CallLogsTable = () => {
  const dispatch = useDispatch();

  const {
    filters: { page },
    totalCallsCount,
  } = useSelector((state: RootState) => state.calls);

  const [transition, setTransition] = useState(true);
  const [callSummary, setCallSummary] = useState<CallLog | null>(null);

  const {
    data: callLogsData,
    isLoading,
    refetch: refetchCallLogs,
  } = useGetCallLogsQuery({
    limit: CALL_LOGS_PAGINATION_LIMIT,
    offset: page * CALL_LOGS_PAGINATION_LIMIT - CALL_LOGS_PAGINATION_LIMIT,
  });

  const { count, data: callLogs = [] } = callLogsData || {};

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

  const getDisplayData = (row: CallLog) => {
    const { details, id } = row;
    if (details) {
      const { callDuration, callInfo, startTime, summary } = details;

      return {
        id,
        callName: callInfo?.summaryName,
        dateAndTime: formatDate(startTime),
        duration: convertSecondsToDuration(callDuration ?? 60),
        qualityScore: summary?.callQuality ?? 0,
        tags: summary?.tags?.map(
          (tag: { tag: string; positivity_rating: number }) => {
            return {
              label: tag?.tag,
              colors: tagColors[tag?.positivity_rating],
            };
          },
        ),
      };
    }
  };

  const getQualityScoreWidth = (percentage: number) => {
    return (percentage / 100) * 128;
  };

  const getDisplayCell = (header: string, callLog: CallLog) => {
    const displayData = getDisplayData(callLog);

    switch (header) {
      case 'tags':
        // TODO: show only 2 -3 tags and show the rest in tooltip
        return (
          <div className="flex gap-1 flex-wrap max-w-full overflow-hidden">
            {displayData.tags?.map((tag: TagDisplay) => (
              <div
                key={tag.label}
                style={{
                  backgroundColor: tag?.colors?.bg,
                  color: tag?.colors?.text,
                }}
                className="rounded-md px-1.5 py-0.5 text-white text-xs font-medium whitespace-nowrap mb-1"
              >
                {tag.label}
              </div>
            ))}
          </div>
        );
      case 'qualityScore':
        return (
          <div className="flex items-center gap-3">
            <label>{displayData.qualityScore}</label>
            <div className="flex gap-1 w-32 h-1">
              <div
                style={{
                  width:
                    !transition &&
                    `${getQualityScoreWidth(displayData.qualityScore)}px`,
                }}
                className="w-0 transition-all duration-300 border-[2px] border-[#6272FF] rounded-md"
              />
              <div
                style={{
                  width:
                    !transition &&
                    `${getQualityScoreWidth(100 - displayData.qualityScore)}px`,
                }}
                className="w-full transition-all duration-300 border-[2px] border-t-[#E6F2FF] rounded-md"
              />
            </div>
          </div>
        );
      case 'notes':
        return (
          <Eye
            className="text-[#868686] w-4 h-4 ml-2 cursor-pointer"
            onClick={() => setCallSummary(callLog)}
          />
        );
      default:
        return displayData[header];
    }
  };

  return (
    <>
      <div
        className={`${callLogs.length > 0 ? 'bg-white shadow-md' : ''} rounded-xl w-full`}
        style={{
          minHeight: `${TABLE_ROW_HEIGHT * (CALL_LOGS_PAGINATION_LIMIT + 1)}px`,
        }}
      >
        <Table sx={{ minWidth: '100%' }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: '#F5F5F5' }}>
            <TableRow>
              {tableHeaders.map((header) => (
                <TableCell key={header.id} sx={{ width: header.width }}>
                  {header.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {callLogs?.map((callLog) => {
              const displayData = getDisplayData(callLog);

              return (
                <TableRow key={displayData.id}>
                  {tableHeaders.map((header) => (
                    <TableCell
                      key={header.id}
                      sx={{
                        width: header.width,
                        height: `${TABLE_ROW_HEIGHT}px`,
                      }}
                    >
                      {getDisplayCell(header.id, callLog)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {callLogs?.length === 0 && (
          <FallbackUI
            image={<NoResults />}
            mainMessage="No call records found"
            description="Your recent calls and insights will be listed here."
            className="py-[100px]"
          />
        )}
      </div>
      {callLogs?.length > 0 && <div className="flex justify-center mt-6">
        <Pagination
          count={Math.ceil(totalCallsCount / CALL_LOGS_PAGINATION_LIMIT)}
          page={page}
          onChange={(_, value) => dispatch(updatePage(value))}
          showFirstButton
          showLastButton
        />
      </div>}
      {callSummary && callSummary?.id && (
        <SummarySideBar
          callSummary={callSummary}
          refetchCallLogs={refetchCallLogs}
          setCallSummary={setCallSummary}
        />
      )}
    </>
  );
};

export default CallLogsTable;
