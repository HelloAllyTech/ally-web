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
