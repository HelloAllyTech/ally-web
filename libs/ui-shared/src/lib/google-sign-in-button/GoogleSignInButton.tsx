"use client";

import { FC } from "react";

import { Google } from "../../assets";

export interface GoogleSignInButtonProps {
  onClick?: () => void;
  text?: string;
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
}

const GoogleSignInButton: FC<GoogleSignInButtonProps> = ({
  onClick,
  text = "Continue with Google",
  disabled = false,
  isLoading = false,
  loadingText = "Signing in...",
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
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
  );
};

export default GoogleSignInButton;
