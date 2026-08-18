import { FC } from "react";

import { TrackItemType } from "@types";

interface TrackTypeIconProps {
  type: TrackItemType;
  className?: string;
}

/**
 * Inline stroke icons for the track item types. Uses currentColor so the
 * parent's text-* theme token drives the colour.
 */
export const TrackTypeIcon: FC<TrackTypeIconProps> = ({ type, className = "w-5 h-5" }) => {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (type) {
    case TrackItemType.ROLEPLAY:
      // Microphone
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </svg>
      );
    case TrackItemType.CASE:
      // Briefcase
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M3 12h18" />
        </svg>
      );
    case TrackItemType.QUIZ:
      // Question mark in circle
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9 1-.9 1.7" />
          <path d="M12 16.6v.2" />
        </svg>
      );
    case TrackItemType.ARTICLE:
      // Document with lines
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M14 3v5h5" />
          <path d="M9 12h6M9 16h6" />
        </svg>
      );
    case TrackItemType.VIDEO:
      // Play in rounded rect
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M10 9.5l5 2.5-5 2.5z" />
        </svg>
      );
    case TrackItemType.JOURNAL:
      // Pen over book
      return (
        <svg {...common}>
          <path d="M4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
          <path d="M4 20h16" />
          <path d="M9 13l6-6 2 2-6 6H9z" />
        </svg>
      );
    case TrackItemType.ANNOTATED_ARTIFACT:
      // Highlighter over marked lines
      return (
        <svg {...common}>
          <path d="M4 6h9M4 10h6" />
          <path d="M4 18h7" />
          <path d="M13.5 16.5l5-5 2.5 2.5-5 5H13.5z" />
          <path d="M13.5 19.5h3" />
        </svg>
      );
    case TrackItemType.GAME:
      // Gamepad
      return (
        <svg {...common}>
          <path d="M7 12h4M9 10v4" />
          <path d="M15.5 11.5h.01M17.5 13.5h.01" />
          <path d="M17 7H7a5 5 0 0 0-5 5v1a4 4 0 0 0 7 2.6h6A4 4 0 0 0 22 13v-1a5 5 0 0 0-5-5z" />
        </svg>
      );
    default:
      return null;
  }
};
