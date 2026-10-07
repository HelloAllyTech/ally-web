import { useEffect, useState, useCallback, FunctionComponent, useRef } from "react";

import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { motion, AnimatePresence } from "framer-motion";
import { Trans, useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { GoogleSignInButton } from "@ally-ui-mono/ui-shared";
import {
  useGenerateOTPMutation,
  useGoogleSignInMutation,
  usePutTermsAndAgreementMutation,
  useVerifyOTPMutation,
} from "@api";
import { AppTooltip, Button, OTP, TermsAndAgreement, TextField } from "@components";
import {
  ALLY_PRIVACY_POLICY_URL,
  ALLY_TERMS_URL,
  LOCAL_STORAGE_KEYS,
  LoginSection,
  ROUTES,
  TooltipLocation,
  User,
} from "@constants";
import { useUser } from "@hooks";
import { RootState } from "@store";
import { validateEmail } from "@utils";

import { LandingHero, LandingNav } from "./landing/LandingHero";
import { ArrowLeftIcon } from "./landing/LandingIcons";
import { LandingSections } from "./landing/LandingSections";
import { SECTION_IDS } from "./landing/links";
import { NightHills, NightStars } from "./landing/NightScene";

const RESEND_CODE_COUNTDOWN = 60; // 2 minutes
const DEFAULT_EXPIRES_IN = 10; // 10 minutes

export const Login: FunctionComponent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useSelector((state: RootState) => state.user);

  // A same-origin, in-app path only — never follow a returnTo that could
  // redirect off the dashboard (e.g. a `//evil.com` protocol-relative URL
  // smuggled through the query string).
  const returnTo = (() => {
    const raw = searchParams.get("returnTo");
    return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
  })();

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

  // Mount-only on purpose: `checkAuth` (from useUser) is a new closure every
  // render and, with no token, dispatches logout actions that re-render this
  // page. Listing it as a dependency created an infinite synchronous render
  // loop that blanked the whole app in production (2026-09-28).
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(returnTo ?? "/");
    }
  }, [isAuthenticated, navigate, user, returnTo]);

  // A session-expiry logout (see `handleLogout` in `api/baseAPI.ts`) is a
  // hard redirect here with `sessionExpired=1` on the URL — surface why the
  // learner landed back on the login screen instead of leaving them to
  // wonder whether they did something wrong.
  useEffect(() => {
    if (searchParams.get("sessionExpired") === "1") {
      toast.info(t("auth.login.sessionExpired"));
    }
  }, [searchParams, t]);

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
  }, [isGenerateOTPSuccess, generateOTPError, generateOTPData, t]);

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
  }, [isVerifyOTPSuccess, verifyOTPError, verifyOTPData, navigate, t]);

  const updateLocalStorageAndNavigate = () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, accessTokenRef.current);
    localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, refreshTokenRef.current);
    navigate(returnTo ?? "/");
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

  const legalLink = (href: string) => (
    // Opens in a new tab so reading the terms never loses what was typed here.
    // Trans fills the anchor's text from the `<terms>`/`<privacy>` tags in the copy.
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary-500 underline underline-offset-2 hover:text-primary-600"
    />
  );

  const primaryButtonClass =
    "w-full !h-[52px] !rounded-[10px] !bg-secondary-900 !text-[17px] !font-semibold hover:!bg-secondary-800 font-primary";

  const spinner = (
    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
  );

  const getLoginSection = () => {
    if (loginSection === LoginSection.EMAIL) {
      return (
        <motion.div
          key="email"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <h2 className="m-0 font-primary text-[30px] font-medium leading-[38px] tracking-[-0.01em]">
              {t("landing.signIn.title")}
            </h2>
            <p className="m-0 font-secondary text-lg leading-[26px] text-secondary-600">
              {t("landing.signIn.subtitle")}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <TextField
              fieldSize="medium"
              type="email"
              inputMode="email"
              autoComplete="email"
              label={t("auth.login.email.label")}
              value={email}
              onChange={handleEmailChange}
              errorMessage={emailError}
              hideError={false}
              placeholder={t("auth.login.email.placeholder")}
              className="w-full rounded-xs"
            />

            <div className="flex min-h-[28px] items-center gap-2.5">
              <input
                type="checkbox"
                id="remember"
                className="h-[18px] w-[18px] cursor-pointer accent-primary-500"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <label
                htmlFor="remember"
                className="inline-flex min-h-[44px] cursor-pointer items-center text-[15px] text-typography-800 md:min-h-0"
              >
                {t("landing.signIn.rememberEmail")}
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <AppTooltip location={TooltipLocation.LOGIN_BUTTON}>
              <Button
                type="button"
                className={primaryButtonClass}
                disabled={isLoading || isSubmitDisabled}
                onClick={handleNext}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    {spinner}
                    {t("landing.signIn.sendingCode")}
                  </div>
                ) : (
                  t("landing.signIn.sendCode")
                )}
              </Button>
            </AppTooltip>
            {import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-grow border-t border-border" />
                  <span className="text-sm text-secondary-600">{t("auth.login.divider")}</span>
                  <div className="flex-grow border-t border-border" />
                </div>
                <GoogleSignInButton
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  text={t("auth.login.google.button")}
                />
              </>
            ) : null}
          </div>
          <p className="m-0 font-secondary text-sm leading-[21px] text-secondary-600">
            <Trans
              i18nKey="landing.signIn.legal"
              components={{
                terms: legalLink(ALLY_TERMS_URL),
                privacy: legalLink(ALLY_PRIVACY_POLICY_URL),
              }}
            />{" "}
            {t("landing.signIn.help")}
          </p>
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
        className="flex flex-col justify-start gap-5"
      >
        <button
          type="button"
          onClick={handleBack}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleBack();
            }
          }}
          aria-label={t("landing.code.back")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-typography-900"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex flex-col gap-2">
          <h2 className="m-0 font-primary text-[30px] font-medium leading-[38px] tracking-[-0.01em]">
            {t("landing.code.title")}
          </h2>
          <p className="m-0 font-secondary text-lg leading-[26px] text-secondary-600 break-words">
            <Trans
              i18nKey="landing.code.sentTo"
              values={{ email }}
              components={{ strong: <strong className="font-semibold text-typography-900" /> }}
            />
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <OTP value={otp} onChange={setOtp} />
          <div className="flex items-center justify-between gap-3 font-secondary text-base text-secondary-600">
            <span>{t("landing.code.expires", { time: otpExpiryText })}</span>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={countdown > 0 || isGeneratingOTP}
              className="min-h-[44px] text-primary-500 underline underline-offset-2 disabled:text-secondary-600 disabled:no-underline"
            >
              {countdown > 0
                ? t("landing.code.resendIn", { seconds: countdown })
                : t("landing.code.resend")}
            </button>
          </div>
        </div>
        <Button
          type="button"
          className={primaryButtonClass}
          disabled={isLoading || isSubmitDisabled}
          onClick={handleVerify}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              {spinner}
              {t("landing.code.verifying")}
            </div>
          ) : (
            t("landing.code.verify")
          )}
        </Button>
        <button
          type="button"
          onClick={handleBack}
          className="min-h-[44px] self-center px-2 font-secondary text-base text-primary-500 underline underline-offset-2"
        >
          {t("landing.code.changeEmail")}
        </button>
      </motion.div>
    );
  };

  const isSubmitDisabled =
    loginSection === LoginSection.EMAIL ? !email || !!emailError : !otp || otp.length < 4;

  return (
    // Same full-height scroll container the old two-pane page used; the
    // in-page section links scroll within it.
    <div className="h-dvh overflow-y-auto bg-background font-primary text-typography-900">
      <section
        id={SECTION_IDS.top}
        className="relative overflow-hidden bg-night-sky px-[clamp(20px,5vw,72px)] pb-60 text-white"
      >
        <NightStars />
        <NightHills />
        <LandingNav />
        <div className="relative z-10 mx-auto flex max-w-[1296px] flex-wrap items-center gap-12 pt-12">
          <LandingHero />
          <div className="min-w-0 flex-[0_1_432px] rounded-[20px] bg-white p-6 text-typography-900 shadow-2xl sm:p-10">
            <AnimatePresence mode="wait">{getLoginSection()}</AnimatePresence>
          </div>
        </div>
      </section>
      <LandingSections />
      <TermsAndAgreement
        isOpen={isOpenTermsAndAgreement}
        handleAgreeButtonClick={handleAgreeButtonClick}
      />
    </div>
  );
};
