export const User = {
  USER_SUSPENDED: "user suspended",
};

/**
 * Emails allowed to see the "Create Note" action on the Sessions tab.
 * Temporary allowlist while the feature is piloted.
 */
export const CREATE_NOTE_ALLOWED_EMAILS = [
  "learner@example.com",
  "sandeep.malhotra+testing@helloally.com",
  "sandeep.malhotra+1@helloally.com",
];

export const canCreateNote = (user?: { email?: string } | null): boolean =>
  !!user?.email && CREATE_NOTE_ALLOWED_EMAILS.includes(user.email);

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
