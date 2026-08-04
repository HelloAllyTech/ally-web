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
  /** Small picture-in-picture self-view sizing: same name + turn-status info
   * as the full-size card, just stacked vertically (instead of side-by-side)
   * and shrunk down to fit a ~100px-wide bubble. */
  compact?: boolean;
}

export const UserCallCard: React.FC<UserCallCardProps> = ({
  userData,
  isSpeaking = false,
  isMuted = false,
  turnState,
  turnIndicatorTranslations,
  compact = false,
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
      className={`absolute bottom-0 left-0 right-0 top-0 rounded-xl flex flex-col justify-end border-transparent ${
        compact ? "p-1 border-2" : "p-2 border-4"
      } ${isSpeaking ? "border-primary-500" : "border-transparent"}`}
    >
      {compact ? (
        <div className="flex flex-col items-start gap-1">
          <div className="w-fit max-w-full flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[rgba(0,0,0,0.40)]">
            {isMuted ? (
              <MicOffWhite className="w-3 h-3 shrink-0" />
            ) : (
              <SpeakingIndicator isSpeaking={isSpeaking} />
            )}
            <span className="text-white text-[10px] font-medium leading-[13px] truncate">
              {name}
            </span>
          </div>
          {turnState && turnState !== TurnState.IDLE && (
            <TurnTakingIndicator
              turnState={turnState}
              translations={turnIndicatorTranslations}
              compact
            />
          )}
        </div>
      ) : (
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
      )}
    </div>
  );

  return (
    <div className="relative flex flex-col bg-[#1d2020] items-center justify-center w-full h-full rounded-xl overflow-hidden transition-colors duration-300">
      {renderImage()}
      {renderOverlay()}
    </div>
  );
};
