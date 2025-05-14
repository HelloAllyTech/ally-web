import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import OtpInput from "react-otp-input";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { useGenerateOTPMutation, useVerifyOTPMutation } from "@/api/auth";
import { Lifeline } from "@/assets/icons";
import { Login as LoginImage } from "@/assets/images";
import { Button, TextField } from "@/components";
import { useUser } from "@/hooks";

const Login = () => {
  const navigate = useNavigate();

  const [loginSection, setLoginSection] = useState<"Phone" | "OTP">("Phone");
  const [phone, setPhone] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);

  const [
    generateOTP,
    { isLoading: isGeneratingOTP, isSuccess: isGenerateOTPSuccess, data: generateOTPData, error: generateOTPError },
  ] = useGenerateOTPMutation();
  const [
    verifyOTP,
    { isLoading: isVerifyingOTP, isSuccess: isVerifyOTPSuccess, data: verifyOTPData, error: verifyOTPError },
  ] = useVerifyOTPMutation();

  const { isAuthenticated, checkAuth } = useUser();

  const isLoading = isGeneratingOTP || isVerifyingOTP;

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (generateOTPError) {
      const error = generateOTPError as FetchBaseQueryError;
      const errorData = error.data as { message: string } | undefined;
      const errorMessage = errorData?.message ?? "Failed to generate OTP. Please try again.";
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
        const errorMessage = errorData?.message ?? "Failed to verify OTP. Please try again.";
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
        <TextField
          label="Phone number"
          fieldSize="medium"
          type="text"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputProps={{
            pattern: "+[0-9]*"
          }}
          placeholder="Enter your phone number"
        />
      );
    } else
      return (
        <div className="flex flex-col gap-2 justify-start">
          <span className="text-[#49454F]">{`Enter the code sent to ${phone}`}</span>
          <OtpInput
            value={otp}
            onChange={(otp) => setOtp(otp)}
            numInputs={4}
            inputStyle="!w-[64px] h-[64px] border-2 border-gray-300 rounded-md p-2"
            containerStyle="flex gap-4 items-center justify-between"
            renderInput={(props) => <input {...props} />}
          />
          <div className="flex items-center gap-2">
            <span className="text-[#49454F]">{"Didn't receive the code?"}</span>
            <button
              onClick={handleResendCode}
              disabled={countdown > 0}
              className={`text-sm 
                ${countdown > 0 ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 cursor-pointer"}`}
              type="button"
            >
              {countdown > 0 ? `Resend (${countdown}s)` : "Resend"}
            </button>
          </div>
        </div>
      );
  };

  const isSubmitDisabled = loginSection === "Phone" ? !phone : (!otp || otp.length < 4);

  const onSubmit = ({ phone, otp }: { phone: string, otp: string }) => {
    if (loginSection === "Phone") {
      generateOTP({ phone });
    } else {
      verifyOTP({ phone, otp });
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
            <h1 className="text-[22px]">Welcome to</h1>
            <Lifeline className="cursor-pointer" />
          </div>
          <div
            className="flex flex-col gap-6"
          >
            {getLoginSection()}
            <Button
              type="button"
              className="w-full"
              disabled={isLoading || isSubmitDisabled}
              onClick={() => onSubmit({ phone, otp })}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {loginSection === "Phone" ? "Generating OTP..." : "Signing in..."}
                </div>
              ) : loginSection === "Phone" ? ( "Generate OTP" ) : ( "Sign in" )
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
