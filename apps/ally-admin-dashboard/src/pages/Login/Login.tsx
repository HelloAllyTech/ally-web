import React, { useState, useEffect, useCallback } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useGenerateOTPMutation, useVerifyOTPMutation } from "@api";
import { ArrowDown, LoginImage } from "@assets";
import { Button, CustomImage, OTP, TextField } from "@components";
import {
  LoginSection,
  LOCAL_STORAGE_KEYS,
  ALLY_TERMS_URL,
  ALLY_PRIVACY_POLICY_URL,
  ALLY_URL,
  en,
} from "@constants";
import { useUser } from "@hooks/useUser";
import { RootState } from "@store";
import { validateEmail, openLinkInNewTab } from "@utils";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.user);

  const [loginSection, setLoginSection] = useState<any>(LoginSection.EMAIL);
  const [email, setEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
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
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (generateOTPError) {
      const error = generateOTPError as any;
      const errorData = error.data as { message: string } | undefined;
      const errorMessage = errorData?.message ?? "Failed to generate OTP. Please try again.";
      toast.error(errorMessage);
    } else if (isGenerateOTPSuccess && generateOTPData) {
      setLoginSection(LoginSection.OTP);
      setCountdown(10); // Start 10 second countdown when OTP is generated
    }
  }, [isGenerateOTPSuccess, generateOTPError, generateOTPData]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  useEffect(() => {
    (async () => {
      if (verifyOTPError) {
        const error = verifyOTPError as any;
        const errorData = error.data as { message: string } | undefined;
        const errorMessage = errorData?.message ?? "Failed to verify OTP. Please try again.";
        toast.error(errorMessage);
      } else if (isVerifyOTPSuccess && verifyOTPData) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, verifyOTPData.accessToken);
        localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, verifyOTPData.refreshToken);
        localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
        const userData = await checkAuth();
        if (userData) {
          navigate("/");
        }
      }
    })();
  }, [isVerifyOTPSuccess, verifyOTPError, verifyOTPData]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail?.toLowerCase());
    if (emailError) {
      setEmailError("");
    }
  };

  const handleBack = () => {
    setLoginSection(LoginSection.EMAIL);
    setOtp("");
  };

  const handleResendCode = useCallback(() => {
    if (countdown === 0) {
      generateOTP({ email });
    }
  }, [countdown, generateOTP, email]);

  const handleNext = () => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", email);
    }
    generateOTP({ email: email.trim() });
  };

  const handleVerify = () => {
    verifyOTP({ email: email.trim(), otp });
  };

  const getLoginSection = () => {
    if (loginSection === LoginSection.EMAIL) {
      return (
        <motion.div
          key="email"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="flex flex-col gap-3 sm:gap-4"
        >
          <div className="flex flex-col text-2xl font-['Replay_Pro']">
            <span className="text-typography-900">{`${en.auth.hey},`}</span>
            <h1 className="text-typography-900">
              <span>{`${en.auth.welcomeTo} `}</span>
              <span className="font-bold italic">ally</span>
            </h1>
            <span className="text-xl mt-6 text-typography-900">
              Enter your email address to continue
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <TextField
              fieldSize="medium"
              type="email"
              inputMode="email"
              label="Email"
              value={email}
              onChange={handleEmailChange as any}
              errorMessage={emailError}
              hideError={false}
              placeholder="Enter your email address"
              className="w-full rounded-xs text-base sm:text-base"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 rounded border-2 border-border-light text-primary-500 focus:ring-primary-500 cursor-pointer"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="text-sm text-typography-600 cursor-pointer">
                {en.auth.rememberMe}
              </label>
            </div>
          </div>
          <Button
            type="button"
            className="w-full rounded-[5px] mt-4 sm:mt-6"
            disabled={isLoading || isSubmitDisabled}
            onClick={handleNext}
          >
            {isLoading ? (
              <div className="flex items-center justify-center text-base">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-[5px] animate-spin mr-2"></div>
                <span className="hidden sm:inline">{en.auth.generatingOTP}</span>
              </div>
            ) : (
              "Next"
            )}
          </Button>
          <div className="text-xs text-typography-800 mt-2 leading-relaxed">
            By tapping next, you agree to Ally's{" "}
            <span
              className="text-primary-500 cursor-pointer hover:text-primary-600"
              onClick={() => openLinkInNewTab(ALLY_TERMS_URL)}
            >
              {en.auth.termsAndConditions}
            </span>{" "}
            and acknowledge{" "}
            <span
              className="text-primary-500 cursor-pointer hover:text-primary-600"
              onClick={() => openLinkInNewTab(ALLY_PRIVACY_POLICY_URL)}
            >
              {en.auth.privacyPolicy}
            </span>
            .
          </div>
        </motion.div>
      );
    }
    return (
      <motion.div
        key="otp"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="flex flex-col justify-start gap-4 sm:gap-6"
      >
        <div
          className="self-start cursor-pointer rotate-90 rounded-full border border-border-light p-2 hover:bg-background-secondary transition-colors"
          onClick={handleBack}
        >
          <ArrowDown />
        </div>
        <h1 className="text-2xl font-['Replay_Pro'] text-typography-900">
          Verify your email address
        </h1>
        <div className="text-base mb-2 font-['Replay_Pro'] flex flex-col">
          <span className="text-xl mb-2 text-typography-900">Enter the security code sent to</span>
          <span className="font-semibold text-xl break-all text-typography-900">{email}</span>
        </div>
        <div className="flex flex-col gap-2">
          <OTP value={otp} onChange={setOtp as any} />
          <div className="text-xs text-typography-600 mt-2">
            {`${en.auth.didNotReceiveTheCode} `}
            <span
              className={`${countdown > 0 ? "text-typography-600" : "text-primary-500 hover:text-primary-600"} cursor-pointer`}
              onClick={handleResendCode}
            >
              Resend {countdown > 0 ? `(${countdown}s)` : ""}
            </span>
          </div>
        </div>
        <Button
          type="button"
          className="w-full rounded-[5px] mt-4 sm:mt-6"
          disabled={isLoading || isSubmitDisabled}
          onClick={handleVerify}
        >
          {isLoading ? (
            <div className="flex items-center justify-center text-base">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-[5px] animate-spin mr-2"></div>
              <span className="hidden sm:inline">{en.auth.signingIn}</span>
            </div>
          ) : (
            "Verify"
          )}
        </Button>
      </motion.div>
    );
  };

  const isSubmitDisabled =
    loginSection === LoginSection.EMAIL ? !email || !!emailError : !otp || otp.length < 4;

  return (
    <div className="flex flex-col lg:flex-row h-screen lg:p-8">
      <div className="hidden md:block lg:max-w-[50%] flex-1 h-full relative">
        <CustomImage
          src={LoginImage}
          alt="Login"
          className="w-full h-full object-cover lg:rounded-[16px]"
        />
        <div
          className="flex items-center gap-2 p-3 rounded-tl-2xl bg-background absolute bottom-0 right-0 cursor-pointer"
          onClick={() => openLinkInNewTab(ALLY_URL)}
        >
          <div className="flex flex-col mr-4 font-['Replay_Pro']">
            <span className="text-xl font-bold text-typography-900">Ally</span>
            <span className="text-sm font-medium text-typography-800">helloally.ai</span>
          </div>
        </div>
      </div>

      <div className="flex-1 absolute min-h-[35vh] p-5 rounded-[10px] bottom-[10%] right-[25%] left-[25%] lg:static bg-background flex flex-col items-center justify-center md:min-h-auto">
        <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col">
            <AnimatePresence mode="wait">{getLoginSection()}</AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
