import type { SVGProps } from "react";

/**
 * Nav icon for the text helpline workspace: two overlapping speech bubbles.
 *
 * Deliberately dependency-free (no @assets, no lucide-react). It is imported by
 * `constants/routes.ts`, which loads in most tests through the @constants
 * barrel — and many of those tests mock @assets or lucide-react with an
 * explicit object that would not list a new icon. See the
 * ally-helpline-routes-icon-asset-mock note.
 */
const HelplineNavIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={`text-typography-900 ${className ?? ""}`}
    {...props}
  >
    <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" />
    <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
  </svg>
);

export default HelplineNavIcon;
