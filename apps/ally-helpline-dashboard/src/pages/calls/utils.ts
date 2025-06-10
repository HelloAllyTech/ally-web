/* eslint-disable max-len */
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

export const convertSecondsToDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / (60 * 60)); // Calculate  
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60); // Remaining hours
  const seconds = totalSeconds % 60; // Remaining minutes

  return `${hours ? `${hours} hour` : ""}${hours > 1 ? "s" : ""} ${minutes ? `${minutes} min` : ""}${minutes > 1 ? "s" : ""} ${seconds ? `${seconds} second` : ""}${seconds > 1 ? "s" : ""}`;
};
