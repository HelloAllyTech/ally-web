"use client";

import { FC } from "react";

import { useGoogleLogin, GoogleLogin } from "@react-oauth/google";

import { Google } from "../../assets";

enum AUTHENTICATION_TYPE {
  GOOGLE_CREDENTIAL = "credential",
  GOOGLE_ACCESS_TOKEN = "accessToken",
}

export interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError?: () => void;
  text?: string;
  disabled?: boolean;
  className?: string;
  authenticationType?: AUTHENTICATION_TYPE;
}

const GoogleSignInButton: FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  text = "Continue with Google",
  authenticationType = AUTHENTICATION_TYPE.GOOGLE_ACCESS_TOKEN,
  disabled = false,
  className = "",
}) => {
  const login = useGoogleLogin({
    onSuccess: tokenResponse => {
      onSuccess(tokenResponse.access_token);
    },
    onError: () => {
      onError?.();
    },
  });

  const handleSuccess = (credentialResponse: { credential?: string }) => {
    if (credentialResponse.credential) {
      onSuccess(credentialResponse.credential);
    }
  };

  const handleError = () => {
    onError?.();
  };

  const handleClick = () => {
    if (!disabled) login();
  };

  if (authenticationType === AUTHENTICATION_TYPE.GOOGLE_CREDENTIAL) {
    return (
      <div className="relative w-full mx-auto">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap={false}
          width="100%"
          containerProps={{
            className: "w-full mx-auto",
          }}
          logo_alignment="center"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
          w-full
          flex
          items-center
          justify-center
          gap-1
          h-[42px]
          px-4
          bg-white
          border
          border-[#dadce0]
          rounded-[5px]
          transition-all
          duration-200
          hover:bg-[#f8f9fa]
          hover:border-[#d2d4d7]
          focus:outline-none
          disabled:opacity-50
          disabled:cursor-not-allowed
          disabled:hover:bg-white
          disabled:hover:border-[#dadce0]
          ${className}
        `}
    >
      <Google />

      <span className="text-[#3c4043] font-semibold text-base tracking-[0.25px] font-tertiary">
        {text}
      </span>
    </button>
  );
};

export default GoogleSignInButton;
