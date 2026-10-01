/**
 * The name to show for a person on the roadmap — never their email address.
 *
 * Some Ally accounts have a blank `name`: the roadmap data import created accounts for source
 * users who had none (`name = ''`, see ally-be's roadmap-import.core.ts), and nothing has named
 * them since. Showing the raw email there made "Posted by" read as a different kind of fact on
 * those cards, so a blank name is built from the email's local part instead —
 * `sandeep.malhotra@…` → "Sandeep Malhotra". Ally addresses are first.last, so this is usually
 * the person's real name; when it is not (`gopi.s` → "Gopi S"), it is still a name.
 *
 * "Unknown user" only when there is nothing to work from — ally-be sends that itself for a
 * deleted account, with an empty email.
 */
export const personName = (person?: { name?: string | null; email?: string | null } | null) => {
  const name = person?.name?.trim();
  if (name) return name;

  const localPart = person?.email?.split("@")[0]?.trim();
  if (!localPart) return "Unknown user";

  return localPart
    .split(/[._+-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
