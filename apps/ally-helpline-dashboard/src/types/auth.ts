export interface GenerateOTPRequest {
  phone?: string;
  email?: string;
}

export interface VerifyOTPRequest {
  phone?: string;
  email?: string;
  otp: string;
}

export interface GenerateOTPResponse {
  success: boolean;
  expiresIn: number;
}

export interface VerifyOTPResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
export interface GetProfileUrlRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}
export interface GetProfileUrlResponse {
  presignedUrl: string;
  profileImageUrl: string;
}

export interface profileUrlRequest {
  profileImageUrl: string;
}
export interface logoUrlResponse {
  name: string;
  logoUrl: string;
}
