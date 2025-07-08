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
}[];

export type GetCounselorStatsResponse = {
  counselorListeningDuration: number;
  counselorName: string;
  counselorSharingDuration: number;
  counselorSharingPercentage: number;
};

export type GetCounselorStatsRequest = {
  startDate?: string;
  endDate?: string;
} | void;
