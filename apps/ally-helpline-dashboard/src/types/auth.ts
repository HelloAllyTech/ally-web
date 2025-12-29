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
