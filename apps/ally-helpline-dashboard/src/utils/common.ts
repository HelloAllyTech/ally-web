import { EMAIL_REGEX } from "@constants";

export const validateEmail = (email: string): boolean => {
  return email && EMAIL_REGEX.test(email);
};

export const getKeyFromIndex = (index: number, prefix: string = "key") => `${prefix}-${index}`;

export const updateQueryParamListWithoutReload = (
  searchParamList: { key: string; value: string }[],
) => {
  const searchParams = new URLSearchParams(window.location.search);

  searchParamList.forEach(({ key, value }) => {
    searchParams.set(key, value);
  });

  // Update URL without page reload
  const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
  window.history.pushState({}, "", newUrl);
};

export const openLinkInNewTab = (url: string, target: string = "_blank") => {
  window.open(url, target, "noopener,noreferrer");
};
