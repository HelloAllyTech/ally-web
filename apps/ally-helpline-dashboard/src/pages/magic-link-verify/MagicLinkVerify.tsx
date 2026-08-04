import React, { useEffect, useRef, useState } from "react";

import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useVerifyMagicLinkMutation, usePutTermsAndAgreementMutation } from "@api";
import { TermsAndAgreement } from "@components";
import { LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { useUser } from "@hooks";

export const MagicLinkVerify: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [verifyMagicLink, { isLoading, isSuccess, data, error }] = useVerifyMagicLinkMutation();
  const [putTermsAndAgreement] = usePutTermsAndAgreementMutation();
  const { checkAuth } = useUser();
  const hasVerified = useRef(false);

  const accessTokenRef = useRef<string>("");
  const refreshTokenRef = useRef<string>("");
  const [isOpenTermsAndAgreement, setIsOpenTermsAndAgreement] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid magic link. Redirecting to login...");
      setTimeout(() => navigate(ROUTES.LOGIN), 2000);
      return;
    }

    // Only trigger verification once, even in StrictMode
    if (!hasVerified.current) {
      hasVerified.current = true;
      verifyMagicLink({ token });
    }
  }, [token, navigate]);

  const updateLocalStorageAndNavigate = async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, accessTokenRef.current);
    localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, refreshTokenRef.current);

    toast.success("Login successful!");

    const userData = await checkAuth();
    if (userData) {
      navigate("/");
    }
  };

  useEffect(() => {
    (async () => {
      if (error) {
        const err = error as FetchBaseQueryError;
        const errorData = err.data as { message: string } | undefined;
        const errorMessage = errorData?.message ?? "Invalid or expired magic link.";
        toast.error(errorMessage);

        setTimeout(() => navigate(ROUTES.LOGIN), 5000);
      } else if (isSuccess && data) {
        accessTokenRef.current = data.accessToken;
        refreshTokenRef.current = data.refreshToken;
        setIsOpenTermsAndAgreement(true);
      }
    })();
  }, [isSuccess, error, data, navigate]);

  const handleAgreeButtonClick = async () => {
    const response = await putTermsAndAgreement({ token: accessTokenRef.current });
    if (response.data?.success) {
      setIsOpenTermsAndAgreement(false);
      updateLocalStorageAndNavigate();
    } else {
      toast.error("Failed to agree to terms and conditions");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-dvh bg-background">
      {(error || (!error && !isSuccess && isLoading)) && (
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-white shadow-lg">
          {error && (
            <>
              <div className="w-12 h-12 rounded-full bg-error-100 flex items-center justify-center">
                <span className="text-2xl text-error-600">✕</span>
              </div>
              <h2 className="text-2xl font-secondary text-typography-900">
                Invalid or Expired Link
              </h2>
              <p className="text-sm text-typography-600">Redirecting to login...</p>
            </>
          )}
          {!error && !isSuccess && isLoading && (
            <>
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <h2 className="text-2xl font-secondary text-typography-900">
                Verifying your magic link...
              </h2>
              <p className="text-sm text-typography-600">Please wait</p>
            </>
          )}
        </div>
      )}
      <TermsAndAgreement
        isOpen={isOpenTermsAndAgreement}
        handleAgreeButtonClick={handleAgreeButtonClick}
      />
    </div>
  );
};
