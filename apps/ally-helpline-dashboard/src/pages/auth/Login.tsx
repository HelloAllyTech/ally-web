import { useEffect, useState, useCallback, FunctionComponent, useRef } from "react";

import { GoogleLogin } from "@react-oauth/google";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import {
  useGenerateOTPMutation,
  useGoogleSignInMutation,
  usePutTermsAndAgreementMutation,
  useVerifyOTPMutation,
} from "@api";
import { Ally, BackCircle, LoginImage, RedirectIcon } from "@assets";
import { Button, Carousel, OTP, TermsAndAgreement, TextField } from "@components";
import {
  ALLY_PRIVACY_POLICY_URL,
  ALLY_TERMS_URL,
  ALLY_URL,
  CAROUSEL_SLIDES,
  LOCAL_STORAGE_KEYS,
  LoginSection,
  ROUTES,
  User,
} from "@constants";
import { useUser } from "@hooks";
import { RootState } from "@store";
import { openLinkInNewTab, validateEmail } from "@utils";

const RESEND_CODE_COUNTDOWN = 60; // 2 minutes
const DEFAULT_EXPIRES_IN = 10; // 10 minutes

export const Login: FunctionComponent = () => {
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
      const errorMessage = errorData?.message ?? "Failed to generate OTP. Please try again.";
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

        const errorMessage = errorData?.message ?? "Failed to verify OTP. Please try again.";
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

  const handleAgreementClose = () => {
    setIsOpenTermsAndAgreement(false);
  };

  const handleAgreeButtonClick = async () => {
    const response = await putCheckTermsAndAgreement({ token: accessTokenRef.current });
    if (response.data?.success) {
      handleAgreementClose();
      updateLocalStorageAndNavigate();
    } else {
      toast.error("Failed to agree to terms and conditions");
    }
  };

  const handleSuccess = async (credentialResponse: any) => {
    try {
      const response = await googleSignIn({ idToken: credentialResponse?.credential });
      if (response?.data) {
        accessTokenRef.current = response?.data.accessToken;
        refreshTokenRef.current = response?.data.refreshToken;
        setIsOpenTermsAndAgreement(true);
      } else {
        toast.error("Google sign in failed");
      }
    } catch {
      toast.error("Google sign in failed");
    }
  };

  const handleError = () => {
    toast.error("Google sign in failed");
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
            <span>Hey,</span>
            <h1>
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                Welcome to <Ally className="mt-2" />
              </span>
            </h1>
            <span className="text-2xl mt-[24px]">Enter your email address to continue</span>
          </div>
          <div className="flex flex-col gap-1">
            <TextField
              fieldSize="medium"
              type="email"
              inputMode="email"
              label="Email"
              value={email}
              onChange={handleEmailChange}
              errorMessage={emailError}
              hideError={false}
              placeholder="Enter your email address"
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
                Remember me
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
                Generating OTP...
              </div>
            ) : (
              "Next"
            )}
          </Button>
          <div className="text-sm text-typography-800 mt-2">
            By tapping next, you agree to Ally's{" "}
            <span
              className="text-primary-500 cursor-pointer"
              onClick={() => openLinkInNewTab(ALLY_TERMS_URL)}
            >
              Terms & Conditions
            </span>{" "}
            and acknowledge{" "}
            <span
              className="text-primary-500 cursor-pointer"
              onClick={() => openLinkInNewTab(ALLY_PRIVACY_POLICY_URL)}
            >
              Privacy Policy.
            </span>
            {FEATURE_FLAGS_MAP.GOOGLE_SIGN_IN_FLAG && (
              <div>
                <div className="flex items-center my-4">
                  <div className="flex-grow border-t border-gray-300" />
                  <span className="mx-3 text-xs text-gray-500">OR</span>
                  <div className="flex-grow border-t border-gray-300" />
                </div>
                <GoogleLogin onSuccess={handleSuccess} onError={handleError} text="continue_with" />
              </div>
            )}
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
        <h1 className="text-4xl font-secondary">Verify your email address</h1>
        <div className="text-base mb-2 font-secondary flex flex-col">
          <span className="text-2xl">Enter the security code sent to</span>
          <span className="font-semibold text-2xl">{email}</span>
        </div>
        <div className="flex flex-col gap-3">
          <OTP value={otp} onChange={setOtp} />
          <div className="text-xs text-typography-900">
            This code will expire in{" "}
            <span className="font-[700]">{`${generateOTPData?.expiresIn ? generateOTPData?.expiresIn / 60 : DEFAULT_EXPIRES_IN} minutes`}</span>
            . Need a new code?
            <span
              className={`${countdown > 0 ? "text-typography-800" : "text-primary-500"} pl-2 cursor-pointer`}
              onClick={handleResendCode}
            >
              Resend {countdown > 0 ? `(${countdown}s)` : ""}
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
              Signing in...
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
    <div className="flex font-primary sm:flex-col md:flex-row h-screen lg:p-8">
      <div className="sm:max-w-full lg:max-w-[50%] flex-1 h-full relative">
        <img
          src={LoginImage}
          alt="Login"
          className="w-full h-full object-cover hidden sm:block lg:rounded-[16px]"
        />
        <Carousel
          slides={CAROUSEL_SLIDES}
          className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] max-h-[470px] max-w-[380px] hidden lg:block"
        />
        <div
          className="flex items-center gap-2 p-3 rounded-tl-2xl bg-white pl-5 absolute bottom-0 right-0 cursor-pointer"
          onClick={() => openLinkInNewTab(ALLY_URL)}
        >
          <div className="flex flex-col mr-4 font-secondary">
            <Ally className="w-10 h-10" />
            <span className="text-sm font-medium text-typography-800">helloally.ai</span>
          </div>
          <RedirectIcon
            width={36}
            height={36}
            className="border border-border-light rounded-sm p-2"
          />
        </div>
      </div>
      <div className="flex-1 absolute min-h-[35vh] p-5 rounded-[10px] bottom-[10%] right-[25%] left-[25%] lg:static bg-white  flex flex-col items-center justify-center md:min-h-auto">
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
