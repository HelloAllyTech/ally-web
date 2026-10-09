import { FC, ReactNode } from "react";

/*
 * Line icons for the sign-in page. Stroke-only and currentColor, so each takes
 * its colour from the text around it. All decorative: the text beside an icon
 * always carries the meaning, so every one is aria-hidden.
 */

type IconProps = { className?: string };

const Stroke: FC<IconProps & { children: ReactNode }> = ({ className = "h-6 w-6", children }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
);

export const ArrowDownIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M12 5v14" />
    <path d="M6 13l6 6 6-6" />
  </Stroke>
);

export const ArrowLeftIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M19 12H5" />
    <path d="M11 18l-6-6 6-6" />
  </Stroke>
);

export const ExternalIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M7 17L17 7" />
    <path d="M8 7h9v9" />
  </Stroke>
);

export const MicIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </Stroke>
);

export const PathIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
  </Stroke>
);

export const DocumentIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h4" />
  </Stroke>
);

export const ChatIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z" />
    <path d="M9 11h.01" />
    <path d="M12 11h.01" />
    <path d="M15 11h.01" />
  </Stroke>
);

export const CommentIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M8 9h8" />
    <path d="M8 12h5" />
  </Stroke>
);

export const LeafIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15" />
    <path d="M5 19l7-7" />
  </Stroke>
);

export const MicOffIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M3 3l18 18" />
  </Stroke>
);

export const ShieldIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </Stroke>
);

export const PersonOffIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    <path d="M3 3l18 18" />
  </Stroke>
);

export const LockIcon: FC<IconProps> = props => (
  <Stroke {...props}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Stroke>
);
