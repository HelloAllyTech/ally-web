import { AnalyticsType } from "@constants";

export const analyticsTypeOptions = [
  { value: AnalyticsType.CallLog, labelKey: "analytics.types.callLogs" },
  {
    value: AnalyticsType.Simulation,
    labelKey: "analytics.types.simulations",
  },
  {
    value: AnalyticsType.Org,
    labelKey: "analytics.types.org",
  },
];

export const ANALYTICS_DASHBOARD_REFRESH_INTERVAL = 870000; //every 14 minutes 30 seconds as expiry is 15 minutes
