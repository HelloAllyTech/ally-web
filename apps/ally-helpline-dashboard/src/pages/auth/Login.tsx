import { useEffect, useState, useCallback, FunctionComponent, useRef } from "react";

import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { GoogleSignInButton } from "@ally-ui-mono/ui-shared";
import {
  useGenerateOTPMutation,
  useGoogleSignInMutation,
  usePutTermsAndAgreementMutation,
  useVerifyOTPMutation,
} from "@api";
import { Ally, BackCircle, LoginImage, RedirectIcon } from "@assets";
import { AppTooltip, Button, OTP, TermsAndAgreement, TextField } from "@components";
import {
  ALLY_PRIVACY_POLICY_URL,
  ALLY_TERMS_URL,
  ALLY_URL,
  LOCAL_STORAGE_KEYS,
  LoginSection,
  ROUTES,
  TooltipLocation,
  User,
} from "@constants";
import { useUser } from "@hooks";
import { RootState } from "@store";
import { openLinkInNewTab, validateEmail } from "@utils";

const RESEND_CODE_COUNTDOWN = 60; // 2 minutes
const DEFAULT_EXPIRES_IN = 10; // 10 minutes

export const Login: FunctionComponent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.user);

  const [loginSection, setLoginSection] = useState<LoginSection>(LoginSection.EMAIL);
  const [email, setEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isOpenTermsAndAgreement, setIsOpenTermsAndAgreement] = useState<boolean>(false);
  const accessTokenRef = useRef<string>("");
  const refreshTokenRef = useRef<string>("");

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

  const [googleSignIn] = useGoogleSignInMutation();

  const { isAuthenticated, checkAuth } = useUser();

  const [putCheckTermsAndAgreement] = usePutTermsAndAgreementMutation();

  const isLoading = isGeneratingOTP || isVerifyingOTP;
  const otpExpiryMinutes = generateOTPData?.expiresIn
    ? generateOTPData.expiresIn / 60
    : DEFAULT_EXPIRES_IN;
  const otpExpiryText = t(otpExpiryMinutes === 1 ? "common.minutes_one" : "common.minutes_other", {
    count: otpExpiryMinutes,
  });

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/");
    }
  }, [isAuthenticated, navigate, user]);

  useEffect(() => {
    if (generateOTPError) {
      const error = generateOTPError as FetchBaseQueryError;
      const errorData = error.data as { message: string } | undefined;
      const errorMessage = errorData?.message ?? t("auth.login.errors.generateOtp");
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
        const error = verifyOTPError as FetchBaseQueryError;
        const errorData = error.data as { message: string } | undefined;
        //TODO: Change navigation based on error message
        if (errorData?.message?.toLowerCase() === User.USER_SUSPENDED) {
          navigate(ROUTES.SUSPENDED_USER);
          return;
        }

        const errorMessage = errorData?.message ?? t("auth.login.errors.verifyOtp");
        toast.error(errorMessage);
      } else if (isVerifyOTPSuccess && verifyOTPData) {
        accessTokenRef.current = verifyOTPData.accessToken;
        refreshTokenRef.current = verifyOTPData.refreshToken;
        setIsOpenTermsAndAgreement(true);
      }
    })();
  }, [isVerifyOTPSuccess, verifyOTPError, verifyOTPData]);

  const updateLocalStorageAndNavigate = () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, accessTokenRef.current);
    localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, refreshTokenRef.current);
    navigate("/");
  };

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
      setEmailError(t("auth.login.email.error"));
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

  const handleAgreementClose = () => {
    setIsOpenTermsAndAgreement(false);
  };

  const handleAgreeButtonClick = async () => {
    const response = await putCheckTermsAndAgreement({ token: accessTokenRef.current });
    if (response.data?.success) {
      handleAgreementClose();
      updateLocalStorageAndNavigate();
    } else {
      toast.error(t("auth.login.errors.agreeTerms"));
    }
  };

  const handleGoogleSuccess = async (tokenData: { accessToken?: string; credential?: string }) => {
    try {
      const params = tokenData.credential
        ? { idToken: tokenData.credential }
        : { accessToken: tokenData.accessToken };

      const response = await googleSignIn(params);
      if (response?.data) {
        accessTokenRef.current = response?.data.accessToken;
        refreshTokenRef.current = response?.data.refreshToken;
        setIsOpenTermsAndAgreement(true);
      } else if (response?.error) {
        const error = response.error as FetchBaseQueryError;
        const errorData = error.data as { message: string } | undefined;
        if (errorData?.message?.toLowerCase() === User.USER_SUSPENDED) {
          navigate(ROUTES.SUSPENDED_USER);
          return;
        }
        toast.error(errorData?.message ?? t("auth.login.google.error"));
      } else {
        toast.error(t("auth.login.google.error"));
      }
    } catch {
      toast.error(t("auth.login.google.error"));
    }
  };

  const handleGoogleError = () => {
    toast.error(t("auth.login.google.error"));
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
            <span>{t("auth.login.greetingLine1")}</span>
            <h1>
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                {t("auth.login.greetingLine2", { app: "" })} <Ally className="mt-2" />
              </span>
            </h1>
            <span className="text-2xl mt-[24px]">{t("auth.login.subtitle")}</span>
          </div>
          <div className="flex flex-col gap-1">
            <TextField
              fieldSize="medium"
              type="email"
              inputMode="email"
              label={t("auth.login.email.label")}
              value={email}
              onChange={handleEmailChange}
              errorMessage={emailError}
              hideError={false}
              placeholder={t("auth.login.email.placeholder")}
              className="w-full rounded-xs"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 rounded border-2 border-border-light text-primary-500 focus:ring-primary-500 cursor-pointer"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="text-sm text-typography-700 cursor-pointer">
                {t("auth.login.rememberMe")}
              </label>
            </div>
          </div>
          <AppTooltip location={TooltipLocation.LOGIN_BUTTON}>
            <Button
              type="button"
              className="w-full rounded-[5px] mt-6"
              disabled={isLoading || isSubmitDisabled}
              onClick={handleNext}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-[5px] animate-spin mr-2"></div>
                  {t("auth.login.generatingOtp")}
                </div>
              ) : (
                t("common.next")
              )}
            </Button>
          </AppTooltip>
          <div className="text-sm text-typography-800">
            <div className="mb-3">
              <div className="flex items-center mb-3">
                <div className="flex-grow border-t border-gray-300" />
                <span className="mx-3 text-xs text-gray-500">{t("auth.login.divider")}</span>
                <div className="flex-grow border-t border-gray-300" />
              </div>
              {import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID ? (
                <GoogleSignInButton
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  text={t("auth.login.google.button")}
                />
              ) : null}
            </div>
            {t("auth.login.proceedAgree")}{" "}
            <span
              className="text-primary-500 cursor-pointer"
              onClick={() => openLinkInNewTab(ALLY_TERMS_URL)}
            >
              {t("auth.login.terms")}
            </span>{" "}
            {t("auth.login.and")}{" "}
            <span
              className="text-primary-500 cursor-pointer"
              onClick={() => openLinkInNewTab(ALLY_PRIVACY_POLICY_URL)}
            >
              {t("auth.login.privacy")}
            </span>
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
        <h1 className="text-4xl font-secondary">{t("auth.login.otp.title")}</h1>
        <div className="text-base mb-2 font-secondary flex flex-col">
          <span className="text-2xl">{t("auth.login.otp.enterCode")}</span>
          <span className="font-semibold text-2xl">{email}</span>
        </div>
        <div className="flex flex-col gap-3">
          <OTP value={otp} onChange={setOtp} />
          <div className="text-xs text-typography-900">
            {t("auth.login.otp.expires", {
              minutes: otpExpiryText,
            })}
            <span
              className={`${countdown > 0 ? "text-typography-800" : "text-primary-500"} pl-2 cursor-pointer`}
              onClick={handleResendCode}
            >
              {countdown > 0
                ? t("auth.login.otp.resendWithCountdown", { seconds: `${countdown}s` })
                : t("auth.login.otp.resend")}
            </span>
          </div>
        </div>
        <Button
          type="button"
          className="w-full rounded-[5px] mt-2  font-tertiary"
          disabled={isLoading || isSubmitDisabled}
          onClick={handleVerify}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-[5px] animate-spin mr-2"></div>
              {t("auth.login.otp.signingIn")}
            </div>
          ) : (
            t("auth.login.otp.verify")
          )}
        </Button>
      </motion.div>
    );
  };

  const isSubmitDisabled =
    loginSection === LoginSection.EMAIL ? !email || !!emailError : !otp || otp.length < 4;

  return (
    <div className="flex flex-col font-primary md:flex-row h-screen overflow-y-auto lg:p-8">
      <div className="hidden sm:block sm:max-w-full lg:max-w-[50%] flex-1 h-full relative">
        <img
          src={LoginImage}
          alt={t("auth.login.imageAlt")}
          className="w-full h-full object-cover hidden sm:block lg:rounded-[16px]"
        />
        <div
          className="flex items-center gap-2 p-3 rounded-tl-2xl bg-white pl-5 absolute bottom-0 right-0 cursor-pointer"
          onClick={() => openLinkInNewTab(ALLY_URL)}
        >
          <div className="flex flex-col mr-4 font-secondary">
            <Ally className="w-10 h-10" />
            <span className="text-sm font-medium text-typography-800">
              {t("auth.login.helloAlly")}
            </span>
          </div>
          <RedirectIcon
            width={36}
            height={36}
            className="border border-border-light rounded-sm p-2"
          />
        </div>
      </div>
      <div className="w-full static sm:absolute sm:flex-1 min-h-[35vh] p-5 rounded-[10px] sm:bottom-[10%] sm:right-[25%] sm:left-[25%] lg:static bg-white  flex flex-col items-center justify-center md:min-h-auto">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="flex flex-col">
            <AnimatePresence mode="wait">{getLoginSection()}</AnimatePresence>
          </div>
        </div>
      </div>
      <TermsAndAgreement
        isOpen={isOpenTermsAndAgreement}
        handleAgreeButtonClick={handleAgreeButtonClick}
      />
    </div>
  );
};
