// Import from the leaf module (not the @types barrel) to avoid a constants<->types
// import cycle — several @types modules import from @constants.
import { UserRole } from "../types/user";

export const User = {
  USER_SUSPENDED: "user suspended",
};

/**
 * Emails allowed to see the Organization Settings tab while the feature is in
 * alpha. Temporary allowlist — remove it (and the allowlist check in
 * canViewOrganizationSettings) once it rolls out to all admins.
 */
export const ORG_SETTINGS_ALLOWED_EMAILS = [
  "learner@example.com",
  "sandeep.malhotra+internal@helloally.ai",
];

/**
 * Organization Settings is an ADMIN-role feature, temporarily gated to the
 * email allowlist above. To roll it out to every admin, drop the allowlist
 * check and keep only the role check.
 */
export const canViewOrganizationSettings = (
  user?: { email?: string; role?: UserRole } | null,
): boolean =>
  user?.role === UserRole.ADMIN &&
  !!user?.email &&
  ORG_SETTINGS_ALLOWED_EMAILS.includes(user.email);

/**
 * Emails allowed to see the "Watch how peers handled this" peer-sessions drawer
 * on the scenario detail page while the feature is in limited rollout. Temporary
 * allowlist — remove it (and the allowlist check in Scenario.tsx) once it rolls
 * out to all reviewers. The permission gate (reviewer + learner) still applies
 * on top of this list.
 */
export const PEER_SESSIONS_ALLOWED_EMAILS = [
  "learner@example.com",
  "sandeep.malhotra+1@helloally.ai",
  "sandeep.malhotra+internal@helloally.ai",
];

// In-app privacy page (ROUTES.PRIVACY), opened in a new tab via openLinkInNewTab.
export const PRIVACY_POLICY_URL = "/privacy";

export const termsAndAgreementData = [
  {
    heading: "General Terms (All Users)",
    content: [
      "You are 18+ and legally able to enter contracts",
      "You are accessing Ally through a partner organization formally engaged with Ally or through direct invitation by Ally for demonstration, testing or research purposes.",
      "You are using Ally’s platform in accordance with your affiliated organization’s rules, ethics and requirements.",
      "You understand that Ally is NOT for real emergencies. Contact crisis services, if needed. More information: <a>https://findahelpline.com/</a>",
    ],
  },
  {
    heading: "For Ally Skills Lab (Training Simulations)",
    content: [
      "You understand that all the scenarios are fictional, and for training purposes only.",
      "You understand that this doesn't replace human-supervised training, provide certification, or qualify you for independent practice.",
      "You consent to audio and transcripts of role-play sessions being stored for quality improvement and being shared with your training organization/supervisor.",
    ],
  },
  {
    heading: "For Ally Assist (Session Notes)",
    content: [
      "You will use this only for authorized sessions per your organization's rules",
      "For this product, <b>audio recordings are NOT stored by Ally</b>. Transcripts of sessions are stored and deleted based on the user organization’s decision",
    ],
  },
];
