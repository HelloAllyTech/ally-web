import { EMAIL_REGEX } from "@/constants/common";

export const validateEmail = (email: string): boolean => {
  return email && EMAIL_REGEX.test(email);
};

export const getKeyFromIndex = (index: number, prefix: string = "key") => `${prefix}-${index}`;
