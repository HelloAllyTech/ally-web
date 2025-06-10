export interface CalendarProps {
  mode: "day" | "week" | "month" | "year" | "all";
  onChange: (value: any) => void;
  onMonthClick?: (value: any) => void;
  onYearClick?: (value: any) => void;
  value?: any;
  className?: string;
  disableFuture?: boolean;
}