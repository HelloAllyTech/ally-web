import { CircularProgress } from "@mui/material";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { format, startOfMonth, startOfYear, subDays } from "date-fns";

import { Button, Calendar } from "@/components";
import { useLazyGetCounselorStatsQuery } from "@/api/analytics";

import { ListeningChart } from "./components";
import { CalendarMode } from "./types";

const UserAnalytics: FunctionComponent = () => {
  const [getCounselorStats, { data: counselorStats, isLoading: statsLoading }] =
    useLazyGetCounselorStatsQuery();

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
    getCounselorStats({
      startDate: format(calendarValue[0], "yyyy-MM-dd"),
      endDate: format(calendarValue[1], "yyyy-MM-dd"),
    });
  }, [mode]);

  const handleModeChange = (mode: CalendarMode) => {
    setMode(mode);
    const date = new Date();
    switch (mode) {
      case CalendarMode.DAY: {
        setCalendarValue([date, date]);
        setDisplayDate([date, date]);
        break;
      }
      case CalendarMode.WEEK: {
        setCalendarValue([subDays(date, 6), date]);
        setDisplayDate([subDays(date, 6), date]);
        break;
      }
      case CalendarMode.MONTH: {
        setCalendarValue([startOfMonth(date), date]);
        setDisplayDate([startOfMonth(date), date]);
        break;
      }
      case CalendarMode.YEAR: {
        setCalendarValue([startOfYear(date), date]);
        setDisplayDate([startOfYear(date), date]);
        break;
      }
      case CalendarMode.ALL: {
        getCounselorStats({ startDate: null, endDate: null });
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

  const handleDateChange = (calendarValue: Date) => {
    switch (mode) {
      case CalendarMode.DAY: {
        setCalendarValue([calendarValue, calendarValue]);
        break;
      }
      case CalendarMode.WEEK: {
        // Calculate the range from a single selected date
        const startDate = subDays(calendarValue, 6);
        setCalendarValue([startDate, calendarValue]);
        break;
      }
    }
  };

  const handleMonthChange = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    setCalendarValue([dateObj, new Date()]);
  };

  const handleYearChange = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    setCalendarValue([dateObj, new Date()]);
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
            listeningPercentage={counselorStats?.counselorSharingPercentage ?? 0}
          />
        </div>
      )}

      <div className="flex flex-col gap-2 items-center flex-1 relative">
        <div className="flex gap-2 bg-[#F5F5F5] p-2 rounded-[4px]">
          {viewButtons.map((button) => (
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
        <div
          className="w-[140px] text-[14px] text-center border border-[#E5E5E5] rounded-[4px] py-2 px-3 cursor-pointer"
          onClick={() => setIsCalendarOpen((prev) => !prev)}
        >
          {getDisplayDate()}
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
              <Button className="bg-transparent text-[#000] hover:bg-transparent" onClick={handleCancel}>Cancel</Button>
              <Button className="bg-transparent text-[#1480FB] hover:bg-transparent" onClick={handleOk}>OK</Button>
            </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default UserAnalytics;
