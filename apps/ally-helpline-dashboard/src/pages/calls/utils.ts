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

export const getRandomValue = (
  arr: { bg: string; text: string }[],
  prevValue: { bg: string; text: string }[]
): { bg: string; text: string } => {
  if (arr.length < 2) return arr[0]; // Edge case: If only one value exists, return it

  let newValue: { bg: string; text: string };
  do {
    newValue = arr[Math.floor(Math.random() * arr.length)];
  } while (
    prevValue.length > 0 &&
    prevValue.filter((e) => e.bg === newValue.bg).length !== 0
  ); // Ensure the new value is not the same as the previous value

  return newValue;
};

export const convertMinutesToDuration = (totalMinutes: number): string => {
  const days = Math.floor(totalMinutes / (24 * 60)); // Calculate days
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60); // Remaining hours
  const minutes = totalMinutes % 60; // Remaining minutes

  return `${days ? ` ${days} day` : ""}${days > 1 ? "s" : ""} ${hours ? `${hours} hour` : ""}${hours > 1 ? "s" : ""} ${minutes ? `${minutes} min` : ""}${minutes > 1 ? "s" : ""}`;
};
