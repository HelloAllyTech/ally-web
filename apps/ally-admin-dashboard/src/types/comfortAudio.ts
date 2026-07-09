/** A superadmin-uploaded comfort-audio track from the shared library. */
export interface ComfortAudioTrack {
  id: string;
  name: string;
  audioUrl: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetComfortAudioTracksQueryParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
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
