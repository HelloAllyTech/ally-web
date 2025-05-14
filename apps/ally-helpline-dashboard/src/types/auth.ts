export interface GenerateOTPRequest {
  phone: string;
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface GenerateOTPResponse {
  success: boolean;
}

export interface VerifyOTPResponse {
  accessToken: string;
  refreshToken: string;
}
