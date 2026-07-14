/** A superadmin-uploaded comfort-audio track from the shared library. */
export interface ComfortAudioTrack {
  id: string;
  name: string;
  audioUrl: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  /**
   * Archived tracks can no longer be newly selected for a roleplay, but keep
   * working for scenarios that already reference them.
   */
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetComfortAudioTracksQueryParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
  /** Include archived tracks (superadmin library screen). Defaults to false. */
  includeArchived?: boolean;
}

export interface GetComfortAudioTracksResponse {
  tracks: ComfortAudioTrack[];
  count: number;
}

export interface CreateComfortAudioUploadUrlRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface CreateComfortAudioUploadUrlResponse {
  presignedUrl: string;
  audioUrl: string;
}

export interface AddComfortAudioTrackRequest {
  name: string;
  audioUrl: string;
  contentType?: string;
  sizeBytes?: number;
}

/** Rename and/or archive-toggle an existing track. */
export interface UpdateComfortAudioTrackRequest {
  id: string;
  name?: string;
  isArchived?: boolean;
}
