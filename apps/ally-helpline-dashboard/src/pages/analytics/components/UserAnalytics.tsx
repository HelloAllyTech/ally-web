import { CircularProgress } from "@mui/material";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button, Calendar } from "@/components";
import { useLazyGetCounselorStatsQuery } from "@/api/analytics";
import { getDateRange } from "@/utils/date";

import { CalendarMode } from "../types";
import { ListeningChart } from ".";

const UserAnalytics: FunctionComponent = () => {
  const [
    getCounselorStats,
    { data: counselorStats, isLoading: statsLoading, isError: isStatsError },
  ] = useLazyGetCounselorStatsQuery();

  const isLoading = useMemo(() => statsLoading, [statsLoading]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarValue, setCalendarValue] = useState<[Date, Date]>([new Date(), new Date()]);
  const [mode, setMode] = useState<CalendarMode>(CalendarMode.DAY);
  const [displayDate, setDisplayDate] = useState<[Date, Date]>([new Date(), new Date()]);

  const viewButtons = [
    { label: "D", view: CalendarMode.DAY },
    { label: "W", view: CalendarMode.WEEK },
    { label: "M", view: CalendarMode.MONTH },
    { label: "Y", view: CalendarMode.YEAR },
    { label: "All", view: CalendarMode.ALL },
  ];

  useEffect(() => {
    if (mode === CalendarMode.ALL) {
      getCounselorStats();
    } else {
      getCounselorStats({
        startDate: format(calendarValue[0], "yyyy-MM-dd"),
        endDate: format(calendarValue[1], "yyyy-MM-dd"),
      });
    }
  }, [mode, displayDate]);

  const handleModeChange = (mode: CalendarMode) => {
    setMode(mode);
    const date = new Date();
    switch (mode) {
      case CalendarMode.DAY: {
        const [startDate, endDate] = getDateRange(date, "day");
        setCalendarValue([startDate, endDate]);
        setDisplayDate([startDate, endDate]);
        break;
      }
      case CalendarMode.WEEK: {
        const [startDate, endDate] = getDateRange(date, "week");
        setCalendarValue([startDate, endDate]);
        setDisplayDate([startDate, endDate]);
        break;
      }
      case CalendarMode.MONTH: {
        const [startDate, endDate] = getDateRange(date, "month");
        setCalendarValue([startDate, endDate]);
        setDisplayDate([startDate, endDate]);
        break;
      }
      case CalendarMode.YEAR: {
        const [startDate, endDate] = getDateRange(date, "year");
        setCalendarValue([startDate, endDate]);
        setDisplayDate([startDate, endDate]);
        break;
      }
      case CalendarMode.ALL: {
        break;
      }
    }
  };

  const getDisplayDate = () => {
    switch (mode) {
      case CalendarMode.DAY:
        return format(displayDate[0], "MMM dd");
      case CalendarMode.WEEK:
        return `${format(displayDate[0], "MMM dd")} - ${format(displayDate[1], "MMM dd")}`;
      case CalendarMode.MONTH:
        return format(displayDate[0], "MMM yyyy");
      case CalendarMode.YEAR:
        return format(displayDate[0], "yyyy");
      case CalendarMode.ALL:
        return "All";
    }
  };

  const handleDisplayDateChange = (direction: "prev" | "next") => {
    const [startDate, endDate] = displayDate;

    switch (mode) {
      case CalendarMode.DAY: {
        startDate.setDate(startDate.getDate() + (direction === "next" ? 1 : -1));
        endDate.setDate(endDate.getDate() + (direction === "next" ? 1 : -1));
        break;
      }
      case CalendarMode.WEEK: {
        startDate.setDate(startDate.getDate() + (direction === "next" ? 7 : -7));
        endDate.setDate(endDate.getDate() + (direction === "next" ? 7 : -7));
        break;
      }
      case CalendarMode.MONTH: {
        startDate.setMonth(startDate.getMonth() + (direction === "next" ? 1 : -1));
        endDate.setMonth(endDate.getMonth() + (direction === "next" ? 1 : -1));
        break;
      }
      case CalendarMode.YEAR: {
        startDate.setFullYear(startDate.getFullYear() + (direction === "next" ? 1 : -1));
        endDate.setFullYear(endDate.getFullYear() + (direction === "next" ? 1 : -1));
        break;
      }
    }

    setCalendarValue([startDate, endDate]);
    setDisplayDate([startDate, endDate]);
  };

  const handleDateChange = (calendarValue: Date) => {
    switch (mode) {
      case CalendarMode.DAY: {
        const [startDate, endDate] = getDateRange(calendarValue, "day");
        setCalendarValue([startDate, endDate]);
        break;
      }
      case CalendarMode.WEEK: {
        const [startDate, endDate] = getDateRange(calendarValue, "week");
        setCalendarValue([startDate, endDate]);
        break;
      }
    }
  };

  const handleMonthChange = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const [startDate, endDate] = getDateRange(dateObj, "month");
    setCalendarValue([startDate, endDate]);
  };

  const handleYearChange = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const [startDate, endDate] = getDateRange(dateObj, "year");
    setCalendarValue([startDate, endDate]);
  };

  const handleCancel = () => {
    setCalendarValue(displayDate);
    setIsCalendarOpen(false);
  };

  const handleOk = () => {
    setDisplayDate(calendarValue);
    getCounselorStats({
      startDate: format(calendarValue[0], "yyyy-MM-dd"),
      endDate: format(calendarValue[1], "yyyy-MM-dd"),
    });
    setIsCalendarOpen(false);
  };

  return (
    <div className="flex justify-start items-start bg-white p-6 w-full h-full gap-6">
      {isLoading && !counselorStats ? (
        <div className="flex justify-center items-center h-[calc(100%_-_80px)]">
          <CircularProgress />
        </div>
      ) : (
        <div className="flex flex-col w-[70%] ml-8 flex-2">
          <ListeningChart
            isEmpty={
              counselorStats?.counselorListeningDuration === 0 &&
              counselorStats?.counselorSharingDuration === 0
            }
            listeningPercentage={
              isStatsError ? 0 : 100 - (counselorStats?.counselorSharingPercentage ?? 0)
            }
          />
        </div>
      )}

      <div className="flex flex-col gap-2 items-center flex-1 relative">
        <div className="flex gap-2 bg-[#F5F5F5] p-2 rounded-[4px]">
          {viewButtons.map(button => (
            <button
              key={button.label}
              onClick={() => handleModeChange(button.view)}
              className={`px-[16px] py-[4px] rounded-[4px] text-[12px] transition-colors text-[#000] ${
                mode === button.view ? "bg-[#fff] font-medium" : ""
              }`}
            >
              {button.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ChevronLeft
            className="cursor-pointer w-4 h-4"
            onClick={() => handleDisplayDateChange("prev")}
          />
          <div
            className="w-[140px] text-[14px] text-center border border-[#E5E5E5] rounded-[4px] py-2 px-3 cursor-pointer"
            onClick={() => setIsCalendarOpen(prev => !prev)}
          >
            {getDisplayDate()}
          </div>
          <ChevronRight
            className="cursor-pointer w-4 h-4"
            onClick={() => handleDisplayDateChange("next")}
          />
        </div>
        {mode !== CalendarMode.ALL && isCalendarOpen && (
          <div
            className="flex flex-col gap-4 bg-[#fff] rounded-[12px] shadow-[0px_0px_10.7px_0px_rgba(0,0,0,0.17)]
              z-10 absolute top-[100px] left-[10px]"
          >
            <Calendar
              mode={mode}
              onChange={handleDateChange}
              value={calendarValue}
              onMonthClick={handleMonthChange}
              onYearClick={handleYearChange}
              disableFuture={true}
            />
            <div className="flex justify-end gap-4 py-2 px-3 border-t border-[#E5E5E5]">
              <Button
                className="bg-transparent text-[#000] hover:bg-transparent"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                className="bg-transparent text-[#1480FB] hover:bg-transparent"
                onClick={handleOk}
              >
                OK
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAnalytics;
