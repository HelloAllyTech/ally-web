const SECONDS_IN = {
  year: 31536000,
  month: 2592000,
  week: 604800,
  day: 86400,
  hour: 3600,
  minute: 60,
  second: 1,
} as const;

const TIME_THRESHOLDS: [keyof typeof SECONDS_IN, number][] = [
  ["month", SECONDS_IN.month],
  ["week", SECONDS_IN.week],
  ["day", SECONDS_IN.day],
  ["hour", SECONDS_IN.hour],
  ["minute", SECONDS_IN.minute],
  ["second", SECONDS_IN.second],
];

const pluralize = (value: number, unit: string) => `${value} ${unit}${value === 1 ? "" : "s"}`;

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date
    .toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" at ", " ");
};

export const formatRelativeTime = (dateString: string): string => {
  const diffSeconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);

  if (diffSeconds < 1) return "Just now";

  const years = Math.floor(diffSeconds / SECONDS_IN.year);

  if (years >= 2) return pluralize(years, "year");

  if (years === 1) {
    const months = Math.floor((diffSeconds % SECONDS_IN.year) / SECONDS_IN.month);
    return months === 0 ? "1 year" : `1 year ${pluralize(months, "month")}`;
  }

  for (const [unit, seconds] of TIME_THRESHOLDS) {
    const value = Math.floor(diffSeconds / seconds);
    if (value >= 1) return pluralize(value, unit);
  }

  return "Just now";
};
