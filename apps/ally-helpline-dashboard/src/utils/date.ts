export const timeStamp = (date?: string) =>
  new Date(date ? date : new Date()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

export const dateStamp = (date?: string) =>
  new Date(date ? date : new Date()).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export const formatMessageDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
};

export const dateTimeStamp = (date?: string) => {
  const dateObj = new Date(date ? date : new Date());
  const dateTime = {
    date: dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    time: dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  };
  return `${dateTime.date} at ${dateTime.time}`;
};

export type DateRangeType = 'day' | 'week' | 'month' | 'year';

export const getDateRange = (date: Date, type: DateRangeType): Date[] => {
  const startDate = new Date(date);
  const endDate = new Date(date);

  if (type === 'day') {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (type === 'week') {
    // Set end date to the provided date
    endDate.setHours(23, 59, 59, 999);
    
    // Set start date to 6 days before the provided date
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
  } else if (type === 'month') {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    
    // Set to last day of the month
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);
  } else if (type === 'year') {
    startDate.setMonth(0, 1); // Set to January 1st
    startDate.setHours(0, 0, 0, 0);
    
    endDate.setMonth(11, 31); // Set to December 31st
    endDate.setHours(23, 59, 59, 999);
  }

  return [startDate, endDate];
};
