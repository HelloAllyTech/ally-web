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
}

export interface VerifyOTPResponse {
  accessToken: string;
  refreshToken: string;
}
