import React, { useState, useEffect, useCallback } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { useGenerateOTPMutation, useVerifyOTPMutation } from "@api";
import { BackCircle, LoginImage } from "@assets";
import { Button, OTP, TextField } from "@components";
import {
  LoginSection,
  LOCAL_STORAGE_KEYS,
  ally_TERMS_URL,
  ally_PRIVACY_POLICY_URL,
  ally_URL,
  en,
} from "@constants";
import { useUser } from "@hooks/useUser";
import { RootState } from "@store";
import { validateEmail, openLinkInNewTab } from "@utils";

const RESEND_CODE_COUNTDOWN = 60; // 60 seconds
const DEFAULT_EXPIRES_IN = 10; // 10 minutes

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
      const errorMessage = errorData?.message ?? en.auth.failedToGenerateOTP;
      toast.error(errorMessage);
    } else if (isGenerateOTPSuccess && generateOTPData) {
      setLoginSection(LoginSection.OTP);
      setCountdown(RESEND_CODE_COUNTDOWN);
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
        const errorMessage = errorData?.message ?? en.auth.failedToVerifyOTP;
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
      setEmailError(en.auth.invalidEmailError);
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
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col text-4xl font-secondary">
            <span className="text-typography-900">{`${en.auth.hey},`}</span>
            <h1 className="text-typography-900">
              <span>{`${en.auth.welcomeTo} `}</span>
              <span className="font-bold italic">{en.auth.ally}</span>
            </h1>
            <span className="text-2xl mt-[24px] text-typography-900">
              {en.auth.enterEmailToContinue}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <TextField
              fieldSize="medium"
              type="email"
              inputMode="email"
              label={en.auth.email}
              value={email}
              onChange={handleEmailChange as any}
              errorMessage={emailError}
              hideError={false}
              placeholder={en.auth.enterEmailPlaceholder}
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
            className="w-full rounded-[5px] mt-6"
            disabled={isLoading || isSubmitDisabled}
            onClick={handleNext}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-[5px] animate-spin mr-2"></div>
                {en.auth.generatingOTP}
              </div>
            ) : (
              en.auth.next
            )}
          </Button>
          <div className="text-sm text-typography-800 mt-2 leading-relaxed">
            {en.auth.byTappingNext}{" "}
            <span
              className="text-primary-500 cursor-pointer hover:text-primary-600"
              onClick={() => openLinkInNewTab(ally_TERMS_URL)}
            >
              {en.auth.termsAndConditions}
            </span>{" "}
            {en.auth.andAcknowledge}{" "}
            <span
              className="text-primary-500 cursor-pointer hover:text-primary-600"
              onClick={() => openLinkInNewTab(ally_PRIVACY_POLICY_URL)}
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
        className="flex flex-col justify-start gap-6"
      >
        <BackCircle className="self-start cursor-pointer ml-[-10px]" onClick={handleBack} />
        <h1 className="text-4xl font-secondary text-typography-900">{en.auth.verifyYourEmail}</h1>
        <div className="text-base mb-2 font-secondary flex flex-col">
          <span className="text-2xl text-typography-900">{en.auth.enterSecurityCode}</span>
          <span className="font-semibold text-2xl text-typography-900">{email}</span>
        </div>
        <div className="flex flex-col gap-2">
          <OTP value={otp} onChange={setOtp} />
          <div className="text-xs text-typography-900">
            {en.auth.codeWillExpire}{" "}
            <span className="font-[700]">{`${generateOTPData?.expiresIn ? generateOTPData?.expiresIn / 60 : DEFAULT_EXPIRES_IN} ${en.auth.minutes}`}</span>
            . {en.auth.needNewCode}
            <span
              className={`${countdown > 0 ? "text-typography-800" : "text-primary-500"} pl-2 cursor-pointer`}
              onClick={handleResendCode}
            >
              {en.auth.resend} {countdown > 0 ? `(${countdown}s)` : ""}
            </span>
          </div>
        </div>
        <Button
          type="button"
          className="w-full rounded-[5px] mt-2 font-tertiary"
          disabled={isLoading || isSubmitDisabled}
          onClick={handleVerify}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-[5px] animate-spin mr-2"></div>
              {en.auth.signingIn}
            </div>
          ) : (
            en.auth.verify
          )}
        </Button>
      </motion.div>
    );
  };

  const isSubmitDisabled =
    loginSection === LoginSection.EMAIL ? !email || !!emailError : !otp || otp.length < 4;

  return (
    <div className="flex font-primary flex-col lg:flex-row h-screen lg:p-8">
      <div className="hidden md:block lg:max-w-[50%] flex-1 h-full relative">
        <CustomImage
          src={LoginImage}
          alt="Login"
          className="w-full h-full object-cover lg:rounded-[16px]"
        />
        <div
          className="flex items-center gap-2 p-3 rounded-tl-2xl bg-background absolute bottom-0 right-0 cursor-pointer"
          onClick={() => openLinkInNewTab(ally_URL)}
        >
          <div className="flex flex-col mr-4 font-secondary">
            <span className="text-xl font-bold text-typography-900">{en.auth.ally}</span>
            <span className="text-sm font-medium text-typography-800">
              {en.auth.helloallyUrl}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 absolute min-h-[35vh] p-5 rounded-[10px] bottom-[10%] right-[25%] left-[25%] lg:static bg-background flex flex-col items-center justify-center md:min-h-auto">
        <div className="w-full max-w-md flex flex-col gap-4 sm:gap-6">
          <AnimatePresence mode="wait">{getLoginSection()}</AnimatePresence>
        </div>
      </div>
    </div>
  );
};
