import { format } from "date-fns";

export const getFormattedDateTime = (dateTime: string, formatString: string) => {
  if (!dateTime) return "--";
  const date = new Date(dateTime);
  return format(date, formatString);
};
