import { EMAIL_REGEX } from "@constants";

export const validateEmail = (email: string): boolean => {
  return email && EMAIL_REGEX.test(email);
};

export const getKeyFromIndex = (index: number, prefix: string = "key") => `${prefix}-${index}`;

export const openLinkInNewTab = (url: string, target: string = "_blank") => {
  window.open(url, target, "noopener,noreferrer");
};
