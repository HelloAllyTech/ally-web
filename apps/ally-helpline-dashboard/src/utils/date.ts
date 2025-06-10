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
