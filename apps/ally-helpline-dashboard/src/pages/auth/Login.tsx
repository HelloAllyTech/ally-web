import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SquareArrowOutUpRight } from "lucide-react";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { useGenerateOTPMutation, useVerifyOTPMutation } from "@/api/auth";
import { LifelineLogo } from "@/assets/icons";
import { Login as LoginImage } from "@/assets/images";
import { Button, TextField } from "@/components";
import { useUser } from "@/hooks";

const Login = () => {
  const navigate = useNavigate();

  const [loginSection, setLoginSection] = useState<"Phone" | "OTP">("Phone");
  const [countryCode] = useState<string>("+91");
  const [phone, setPhone] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const [
    generateOTP,
    {
      isLoading: isGeneratingOTP,
      isSuccess: isGenerateOTPSuccess,
      data: generateOTPData,
      error: generateOTPError,
    },
  ] = useGenerateOTPMutation();
  const [
    verifyOTP,
    {
      isLoading: isVerifyingOTP,
      isSuccess: isVerifyOTPSuccess,
      data: verifyOTPData,
      error: verifyOTPError,
    },
  ] = useVerifyOTPMutation();

  const { isAuthenticated, checkAuth } = useUser();

  const isLoading = isGeneratingOTP || isVerifyingOTP;

  useEffect(() => {
    const rememberedPhone = localStorage.getItem("rememberedPhone");
    if (rememberedPhone) {
      setPhone(rememberedPhone);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (generateOTPError) {
      const error = generateOTPError as FetchBaseQueryError;
      const errorData = error.data as { message: string } | undefined;
      const errorMessage =
        errorData?.message ?? "Failed to generate OTP. Please try again.";
      toast.error(errorMessage);
    } else if (isGenerateOTPSuccess && generateOTPData) {
      setLoginSection("OTP");
      setCountdown(10); // Start 10 second countdown when OTP is generated
    }
  }, [isGenerateOTPSuccess, generateOTPError, generateOTPData]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const handleResendCode = useCallback(() => {
    if (countdown === 0) {
      generateOTP({ phone });
    }
  }, [countdown, generateOTP, phone]);

  useEffect(() => {
    (async () => {
      if (verifyOTPError) {
        const error = verifyOTPError as FetchBaseQueryError;
        const errorData = error.data as { message: string } | undefined;
        const errorMessage =
          errorData?.message ?? "Failed to verify OTP. Please try again.";
        toast.error(errorMessage);
      } else if (isVerifyOTPSuccess && verifyOTPData) {
        localStorage.setItem("accessToken", verifyOTPData.accessToken);
        localStorage.setItem("refreshToken", verifyOTPData.refreshToken);
        await checkAuth();
        navigate("/");
      }
    })();
  }, [isVerifyOTPSuccess, verifyOTPError, verifyOTPData]);

  const getLoginSection = () => {
    if (loginSection === "Phone") {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="text-[#49454F] rounded-[5px] border-2 border-[#E5E7EB] p-2 text-sm">
              {countryCode}
            </div>
            <TextField
              fieldSize="medium"
              type="text"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              className="w-full rounded-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              className="h-4 w-4 rounded border-2 border-[#E5E7EB] text-blue-600 focus:ring-blue-500 cursor-pointer"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label
              htmlFor="remember"
              className="text-sm text-[#49454F] cursor-pointer"
            >
              Remember me
            </label>
          </div>
        </div>
      );
    } else
      return (
        <div className="flex flex-col justify-start">
          <span className="text-base text-gray-500 mb-2">
            <span>Enter verification code sent to your phone number </span>
            <span className="font-semibold">+91 {phone}</span>
            <SquareArrowOutUpRight
              className="w-4 h-4 inline-block ml-1 text-blue-600 cursor-pointer"
              onClick={() => setLoginSection("Phone")}
            />
          </span>
          <span className="text-xs text-[#49454F]">Code</span>
          <TextField
            fieldSize="medium"
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter verification code"
            className="w-full rounded-xs pt-0"
          />
        </div>
      );
  };

  const isSubmitDisabled =
    loginSection === "Phone" ? !phone : !otp || otp.length < 4;

  const onSubmit = ({ phone, otp }: { phone: string; otp: string }) => {
    if (loginSection === "Phone") {
      if (rememberMe) {
        localStorage.setItem("rememberedPhone", phone);
      }
      generateOTP({ phone: `${countryCode}${phone}` });
    } else {
      verifyOTP({ phone: `${countryCode}${phone}`, otp });
    }
  };

  return (
    <div className="flex h-screen">
      <img
        src={LoginImage}
        alt="Login"
        className="flex-2 h-auto object-cover"
        width="60%"
      />
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-1/2 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            {loginSection === "Phone" && (
              <h1 className="text-[22px]">Welcome to</h1>
            )}
            <div className="flex items-center gap-2">
              <LifelineLogo className="cursor-pointer" />
              <h1 className="text-[28px] font-[ReplayPro] font-semibold text-[#081033]">
                Ally
              </h1>
            </div>
          </div>
          <div className="flex flex-col">
            {getLoginSection()}
            <Button
              type="button"
              className="w-full rounded-[5px] mt-6"
              disabled={isLoading || isSubmitDisabled}
              onClick={() => onSubmit({ phone, otp })}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-[5px] animate-spin mr-2"></div>
                  {loginSection === "Phone"
                    ? "Generating OTP..."
                    : "Signing in..."}
                </div>
              ) : (
                "Continue"
              )}
            </Button>
            {loginSection === "OTP" && (
              <Button
                type="button"
                variant="secondary"
                className="w-full rounded-[5px] mt-2"
                disabled={countdown > 0}
                onClick={handleResendCode}
              >
                {countdown > 0 ? `Resend (${countdown}s)` : "Resend"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
