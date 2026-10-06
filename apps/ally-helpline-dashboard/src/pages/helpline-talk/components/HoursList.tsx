import { FC } from "react";

import { useTranslation } from "react-i18next";

import type { HelplineHours } from "@types";

// Monday first: how opening hours are usually listed in India.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Weekday name in the talker's language; day 0 = Sunday (JS getDay). */
export const weekdayName = (day: number, locale: string) => {
  // 2023-01-01 was a Sunday.
  const date = new Date(Date.UTC(2023, 0, 1 + day));
  try {
    return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(date);
  }
};

/** "09:30" → "9:30 am" in the talker's locale. Unparseable input is shown as is. */
export const formatClock = (hhmm: string, locale: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return hhmm;
  const date = new Date(Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2])));
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return hhmm;
  }
};

/** "India Standard Time" for "Asia/Kolkata", localised; the IANA id if the browser can't say. */
export const timezoneLabel = (tz: string, locale: string) => {
  try {
    const part = new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: "long" })
      .formatToParts(new Date())
      .find(item => item.type === "timeZoneName");
    return part?.value || tz;
  } catch {
    return tz;
  }
};

export const HoursList: FC<{ hours: HelplineHours }> = ({ hours }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";

  return (
    <section
      className="rounded-2xl border border-border-light bg-white p-4"
      data-testid="helpline-hours"
    >
      <h2 className="font-primary text-base font-medium text-typography-900">
        {t("helplineTalker.closed.hoursTitle")}
      </h2>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-primary text-base">
        {DAY_ORDER.map(day => {
          const windows = hours.weekly
            .filter(item => item.day === day)
            .sort((a, b) => a.open.localeCompare(b.open));
          return (
            <div key={day} className="contents">
              <dt className="text-typography-800">{weekdayName(day, locale)}</dt>
              <dd className="text-typography-900">
                {windows.length
                  ? windows
                      .map(
                        item =>
                          `${formatClock(item.open, locale)} – ${formatClock(item.close, locale)}`,
                      )
                      .join(", ")
                  : t("helplineTalker.closed.closedDay")}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-2 font-primary text-sm text-typography-700">
        {t("helplineTalker.closed.hoursTimezone", { tz: timezoneLabel(hours.tz, locale) })}
      </p>
    </section>
  );
};
