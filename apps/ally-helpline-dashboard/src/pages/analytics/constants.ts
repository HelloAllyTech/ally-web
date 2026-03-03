import { TFunction } from "i18next";

import { AnalyticsType } from "@constants";

export const getAnalyticsTypeOptions = (t: TFunction) => [
  { value: AnalyticsType.CallLog, label: t("analytics.types.callLogs") },
  { value: AnalyticsType.Simulation, label: t("analytics.types.simulations") },
  { value: AnalyticsType.Org, label: t("analytics.types.org") },
];

export const ANALYTICS_DASHBOARD_REFRESH_INTERVAL = 870000; //every 14 minutes 30 seconds as expiry is 15 minutes
