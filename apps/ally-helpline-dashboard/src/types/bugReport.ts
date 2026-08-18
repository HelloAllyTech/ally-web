/** Wire types for POST /v1/product-roadmap/bug-reports. Mirrors ally-be's ReporterContextDto. */
export interface BugReportContext {
  screen?: string;
  appVersion?: string;
  device?: string;
  os?: string;
  clientTimestamp?: string;
}

export interface CreateBugReportBody {
  description: string;
  context?: BugReportContext;
}

export interface CreateBugReportResponse {
  id: string;
  stage: string;
}
