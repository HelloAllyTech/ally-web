import { Resource } from "@lifeline-ui-mono/ui-shared/types";

export interface GetSearchResultsRequest {
  query: string;
  limit?: number;
  excludedIds?: string[];
  filters?: {
    category?: string;
    tags?: string[];
  };
  sortBy?: string;
  sortOrder?: string;
}

export interface GetSearchResultsResponse {
  documents: Resource[];
  categories: { [key: string]: number };
  total: number;
  limit: number;
}
