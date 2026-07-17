"use client";

import React from "react";

import { MicOffWhite, UserIcon } from "../../assets";
import { CustomImage } from "../custom-image";
import { SpeakingIndicator } from "./SpeakingIndicator";
import { TurnTakingIndicator, TurnState } from "./TurnIndicator";
import { TurnIndicatorTranslations } from "./types";

interface UserCallCardProps {
  userData: {
    name: string;
    coverImageUrl?: string;
  };
  isSpeaking?: boolean;
  isMuted?: boolean;
  turnState?: TurnState;
  turnIndicatorTranslations?: TurnIndicatorTranslations;
}

export const UserCallCard: React.FC<UserCallCardProps> = ({
  userData,
  isSpeaking = false,
  isMuted = false,
  turnState,
  turnIndicatorTranslations,
}) => {
  const { name, coverImageUrl = "" } = userData;

  const renderImage = () => {
    if (coverImageUrl?.length > 0) {
      return (
        <CustomImage
          src={coverImageUrl}
          alt={name}
          className="w-full h-full object-cover"
          fallbackClassName="bg-[#1d2020]"
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#1d2020]">
        <UserIcon />
      </div>
    );
  };

  const renderOverlay = () => (
    <div
      className={`absolute bottom-0 left-0 right-0 top-0 p-2 rounded-xl flex flex-col justify-end border-4 ${
        isSpeaking ? "border-primary-500" : "border-transparent"
      }`}
    >
      <div className="flex flex-row gap-2 items-center">
        <div className="w-fit flex items-center gap-2 p-2 rounded-md bg-[rgba(0,0,0,0.40)]">
          {isMuted ? (
            <MicOffWhite className="w-4 h-4" />
          ) : (
            <SpeakingIndicator isSpeaking={isSpeaking} />
          )}
          <span className="text-white text-[14px] font-medium leading-[22px]">{name}</span>
        </div>
        {turnState && turnState !== TurnState.IDLE && (
          <TurnTakingIndicator turnState={turnState} translations={turnIndicatorTranslations} />
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col bg-[#1d2020] items-center justify-center w-full h-full rounded-xl overflow-hidden transition-colors duration-300">
      {renderImage()}
      {renderOverlay()}
    </div>
  );
};
