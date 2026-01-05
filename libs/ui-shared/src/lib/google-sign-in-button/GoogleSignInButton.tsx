"use client";

import { FC, useRef } from "react";

import { GoogleLogin } from "@react-oauth/google";

import { Google } from "../../assets";

export interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError?: () => void;
  text?: string;
  disabled?: boolean;
  className?: string;
}

const GoogleSignInButton: FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  text = "Continue with Google",
  disabled = false,
  className = "",
}) => {
  const hiddenButtonRef = useRef<HTMLDivElement>(null);

  const handleSuccess = (credentialResponse: { credential?: string }) => {
    if (credentialResponse.credential) {
      onSuccess(credentialResponse.credential);
    }
  };

  const handleError = () => {
    onError?.();
  };

  const handleClick = () => {
    if (disabled) return;
    // Click the hidden Google button
    const googleButton = hiddenButtonRef.current?.querySelector(
      'div[role="button"]',
    ) as HTMLElement;
    if (googleButton) {
      googleButton.click();
    } else {
      onError?.();
    }
  };

  // TODO: Remove this once the GoogleLogin component is working properly
  return (
    <div className="relative flex w-full justify-center items-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        width="100%"
        logo_alignment="center"
      />
    </div>
  );

  return (
    <div className="relative w-full">
      {/* Hidden GoogleLogin component */}
      <div
        ref={hiddenButtonRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: "0",
          width: "400px",
          height: "50px",
          opacity: 0,
        }}
        aria-hidden="true"
      >
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap={false}
          width={400}
        />
      </div>
      {/* Visible custom button */}
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
    </div>
  );
};

export default GoogleSignInButton;
