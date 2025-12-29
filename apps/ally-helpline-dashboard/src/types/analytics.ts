import { AnalyticsType } from "@constants";

export enum CalendarMode {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
  ALL = "all",
}

export interface GetDashboardUrlResponse {
  url: string;
}

export type GetDashboardsResponse = {
  id: string;
  externalId: string;
  name: string;
  analyticsType: AnalyticsType;
}[];

export type GetCounsellorStatsResponse = {
  counselorListeningDuration: number;
  counselorName: string;
  counselorSharingDuration: number;
  counselorSharingPercentage: number;
};

export type GetCounsellorStatsRequest = {
  startDate?: string;
  endDate?: string;
} | void;
