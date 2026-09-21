import { describe, expect, it } from "vitest";

import { getLogsFetchErrorMessage } from "../useLogsFetchErrorToast";

const FALLBACK = "Failed to fetch call logs. Please try again.";

describe("getLogsFetchErrorMessage", () => {
  it("prefers the server's message on a FetchBaseQueryError", () => {
    expect(getLogsFetchErrorMessage({ status: 500, data: { message: "Boom" } })).toBe("Boom");
  });

  it("falls back to a SerializedError's error string", () => {
    expect(getLogsFetchErrorMessage({ error: "Network Error" })).toBe("Network Error");
  });

  it("uses the generic line for shapes it does not recognise", () => {
    expect(getLogsFetchErrorMessage({ status: 503 })).toBe(FALLBACK);
    expect(getLogsFetchErrorMessage({ data: { message: 42 } })).toBe(FALLBACK);
    expect(getLogsFetchErrorMessage(null)).toBe(FALLBACK);
    expect(getLogsFetchErrorMessage("nope")).toBe(FALLBACK);
    expect(getLogsFetchErrorMessage(undefined)).toBe(FALLBACK);
  });
});
