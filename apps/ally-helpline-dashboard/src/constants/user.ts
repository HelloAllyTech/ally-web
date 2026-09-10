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
 * The roles admin.helloally.ai actually admits at login. Kept deliberately
 * identical to the `allowedRoles` the admin console sends on every auth call
 * (ally-admin-dashboard `src/api/auth.ts`) — the whole point of the Ally Admin
 * link is that everyone who sees it can get in, so this list must not drift
 * from that one.
 *
 * Notably excluded is tenant ADMIN: it carries `organization:access`, not
 * `system:access`, and the console's login rejects it. Holding permissions a
 * super admin holds is not the test either — admission is by role name, so a
 * role that merely clones SUPER_ADMIN's grants still cannot sign in. Add a role
 * here only when it is added to the admin console's `allowedRoles` too.
 */
export const ALLY_ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.SUPER_DUPER_ADMIN,
  UserRole.MULTI_TENANT_ADMIN,
];

/**
 * True when this consumer-app account also has access to the Ally Admin
 * console — i.e. the same user record additionally holds a platform admin role.
 *
 * Reads the `roles` array, never the single `role`. `GET /users/me` collapses a
 * multi-role account to one `role` by a backend priority list
 * (SUPER_DUPER_ADMIN > SUPER_ADMIN > ADMIN > COUNSELOR > first row), which is
 * lossy in exactly the case that matters here: MULTI_TENANT_ADMIN is absent
 * from that list, so a user holding [LEARNER, MULTI_TENANT_ADMIN] can report
 * `role: "LEARNER"` and would fail a `role`-based check despite being able to
 * log into the console. `role` is only a fallback for cached/older payloads
 * predating `roles` (same reasoning as resolveAdminRole in the admin console).
 *
 * Scope: this detects a *single account carrying both role sets*. It cannot see
 * a separate `name+admin@…` alias account — that is a different `users` row
 * under a different email, and no API today links the two.
 */
export const hasAllyAdminAccess = (
  user?: { role?: UserRole; roles?: UserRole[] } | null,
): boolean => {
  const held = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
  return held.some(role => (ALLY_ADMIN_ROLES as string[]).includes(role));
};

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
