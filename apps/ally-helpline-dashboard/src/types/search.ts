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
  documents: any[];
  total: number;
  limit: number;
}
