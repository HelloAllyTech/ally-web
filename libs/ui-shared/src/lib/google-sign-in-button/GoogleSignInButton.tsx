"use client";

import { FC, useEffect, useRef, useState } from "react";

import { Google } from "../../assets";

// Declare google types for GIS
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          prompt: () => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: string;
              size?: string;
              width?: number;
              type?: string;
            },
          ) => void;
        };
      };
    };
  }
}

export interface GoogleSignInButtonProps {
  clientId: string;
  onSuccess: (credential: string) => void;
  onError?: () => void;
  text?: string;
  disabled?: boolean;
  loadingText?: string;
  className?: string;
}

const GoogleSignInButton: FC<GoogleSignInButtonProps> = ({
  clientId,
  onSuccess,
  onError,
  text = "Continue with Google",
  disabled = false,
  loadingText = "Signing in...",
  className = "",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!clientId) return undefined;

    let checkGoogleLoaded: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const initializeGoogleSignIn = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential: string }) => {
            setIsLoading(false);
            onSuccess(response.credential);
          },
          auto_select: false,
        });

        // Render hidden button for programmatic triggering
        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            width: 400,
          });
          setIsInitialized(true);
        }
      }
    };

    // Check if GIS script is already loaded
    if (window.google?.accounts?.id) {
      initializeGoogleSignIn();
    } else {
      // Wait for script to load (it's loaded by GoogleOAuthProvider)
      checkGoogleLoaded = setInterval(() => {
        if (window.google?.accounts?.id) {
          if (checkGoogleLoaded) clearInterval(checkGoogleLoaded);
          initializeGoogleSignIn();
        }
      }, 100);

      // Cleanup interval after 5 seconds
      timeout = setTimeout(() => {
        if (checkGoogleLoaded) clearInterval(checkGoogleLoaded);
      }, 5000);
    }

    return () => {
      if (checkGoogleLoaded) clearInterval(checkGoogleLoaded);
      if (timeout) clearTimeout(timeout);
    };
  }, [clientId, onSuccess]);

  const handleClick = () => {
    if (!isInitialized) {
      onError?.();
      return;
    }

    setIsLoading(true);
    // Click the hidden Google button
    const googleButton = googleButtonRef.current?.querySelector(
      'div[role="button"]',
    ) as HTMLElement;
    if (googleButton) {
      googleButton.click();
    } else {
      setIsLoading(false);
      onError?.();
    }
  };

  return (
    <>
      {/* Hidden Google button container - rendered off-screen but accessible */}
      <div
        ref={googleButtonRef}
        className="absolute opacity-0 pointer-events-none h-0 overflow-hidden"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
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
          focus:ring-2
          focus:ring-offset-2
          focus:ring-[#4285f4]
          disabled:opacity-50
          disabled:cursor-not-allowed
          disabled:hover:bg-white
          disabled:hover:border-[#dadce0]
          ${className}
        `}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-[#4285f4] rounded-full animate-spin" />
        ) : (
          <Google />
        )}
        <span className="text-[#3c4043] font-semibold text-base tracking-[0.25px] font-tertiary">
          {isLoading ? loadingText : text}
        </span>
      </button>
    </>
  );
};

export default GoogleSignInButton;
