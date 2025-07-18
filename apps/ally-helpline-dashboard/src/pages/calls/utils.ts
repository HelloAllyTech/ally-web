//TODO: removal of disable-max-len
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);

  const formattedDate = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${formattedDate} ${formattedTime}`; // Concatenating manually to avoid 'at' in between
};

export const convertSecondsToDuration = (totalSeconds?: number): string => {
  if (!totalSeconds) return "--";
  if (totalSeconds < 60) return "Less than 1 min";

  const hours = Math.floor(totalSeconds / (60 * 60)); // Calculate
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60); // Remaining hours
  const seconds = totalSeconds % 60; // Remaining minutes

  return `${hours ? `${hours} hr` : ""}${hours > 1 ? "s" : ""} ${
    minutes ? `${minutes} min` : ""
  }${minutes > 1 ? "s" : ""} ${seconds ? `${seconds} sec` : ""}${seconds > 1 ? "s" : ""}`;
};
