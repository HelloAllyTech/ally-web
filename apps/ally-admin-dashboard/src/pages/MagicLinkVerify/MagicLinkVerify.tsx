import React, { useEffect, useRef } from "react";

import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useVerifyMagicLinkMutation } from "@api";
import { LOCAL_STORAGE_KEYS, ROUTES, en } from "@constants";
import { useUser } from "@hooks";

export const MagicLinkVerify: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [verifyMagicLink, { isLoading, isSuccess, data, error }] = useVerifyMagicLinkMutation();
  const { checkAuth } = useUser();
  const hasVerified = useRef(false);

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
  }, [token, navigate]); // Removed verifyMagicLink from dependencies

  useEffect(() => {
    (async () => {
      if (error) {
        const err = error as FetchBaseQueryError;
        const errorData = err.data as { message: string } | undefined;
        const errorMessage = errorData?.message ?? "Invalid or expired magic link.";
        toast.error(errorMessage);

        setTimeout(() => navigate(ROUTES.LOGIN), 5000); // Increased to 5 seconds
      } else if (isSuccess && data) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, data.accessToken);
        localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, data.refreshToken);
        localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");

        toast.success("Login successful!");

        const userData = await checkAuth();
        if (userData) {
          navigate("/");
        }
      }
    })();
  }, [isSuccess, error, data, checkAuth, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {(error || (!error && !isSuccess && isLoading)) && (
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-white shadow-lg">
          {error && (
            <>
              <div className="w-12 h-12 rounded-full bg-error-100 flex items-center justify-center">
                <span className="text-2xl text-error-600">✕</span>
              </div>
              <h2 className="text-2xl font-secondary text-typography-900">
                {en.auth.magicLinkExpired}
              </h2>
              <p className="text-sm text-typography-600">{en.auth.redirectingToLogin}</p>
            </>
          )}
          {!error && !isSuccess && isLoading && (
            <>
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <h2 className="text-2xl font-secondary text-typography-900">
                {en.auth.verifyingMagicLink}
              </h2>
              <p className="text-sm text-typography-600">{en.auth.pleaseWait}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
