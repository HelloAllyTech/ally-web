import { Resource } from '@ally-ui-mono/ui-shared/types';

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
  total: number;
  limit: number;
}
