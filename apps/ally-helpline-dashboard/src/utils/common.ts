export const validateEmail = (email: string): boolean => {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email && EMAIL_REGEX.test(email);
};
