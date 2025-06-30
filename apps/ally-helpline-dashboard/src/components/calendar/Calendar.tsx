import { FC } from "react";
import { Calendar as ReactCalendar } from "react-calendar";

import { CalendarProps } from "./types";

import "react-calendar/dist/Calendar.css";
import "./Calendar.css";

const Calendar: FC<CalendarProps> = ({
  onChange,
  value,
  mode,
  onMonthClick,
  onYearClick,
  disableFuture,
}) => {
  const getView = () => {
    switch (mode) {
      case "day":
        return "month";
      case "week":
        return "month";
      case "month":
        return "year";
      case "year":
        return "decade";
    }
  };

  const handleChange = (date: Date | Date[]) => {
    if (mode === "week") {
      onChange(Array.isArray(date) ? date[0] : date);
    } else {
      onChange(date);
    }
  };

  const getTileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === "month") {
      const [start, end] = value;
      const isRange = start.toDateString() !== end.toDateString();
      const isStart = date.toDateString() === start.toDateString();
      const isEnd = date.toDateString() === end.toDateString();
      const isBetween = date > start && date < end;
      const isSingleSelected =
        date.toDateString() === start.toDateString() && date.toDateString() === end.toDateString();

      if (isRange) {
        if (isStart) return "rangeStart";
        if (isEnd) return "rangeEnd";
        if (isBetween) return "rangeBetween";
      }
      if (isSingleSelected) return "singleSelected";
    }
    return "";
  };

  const tileDisabled = ({ date }: { date: Date; view: string }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  return (
    <ReactCalendar
      onChange={handleChange}
      value={value}
      view={getView()}
      onClickMonth={onMonthClick}
      onClickYear={onYearClick}
      selectRange={false}
      className="border-none shadow-none"
      tileClassName={getTileClassName}
      tileDisabled={disableFuture ? tileDisabled : undefined}
    />
  );
};

export default Calendar;
