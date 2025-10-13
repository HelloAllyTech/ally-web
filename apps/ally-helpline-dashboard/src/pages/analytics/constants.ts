import { AnalyticsType } from "@constants";

export const analyticsTypeOptions = [
  { value: AnalyticsType.CallLog, label: "Real call logs" },
  {
    value: AnalyticsType.Simulation,
    label: "Simulations",
  },
  {
    value: AnalyticsType.Org,
    label: "Org Analytics",
  },
];

export const ANALYTICS_DASHBOARD_REFRESH_INTERVAL = 870000; //every 14 minutes 30 seconds as expiry is 15 minutes
