import { beforeEach, describe, expect, it } from "vitest";

import { LOCAL_STORAGE_KEYS } from "@constants";

import { adoptConsumerSession } from "../consumerSession";

// Tests always run as a standalone build (vitest reports BASE_URL as "/"), so
// the surface is passed in explicitly rather than mocked.
const EMBEDDED = true;
const STANDALONE = false;

const CONSUMER_ACCESS_TOKEN = "accessToken";
const CONSUMER_REFRESH_TOKEN = "refreshToken";

describe("adoptConsumerSession", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const seedConsumerSession = () => {
    localStorage.setItem(CONSUMER_ACCESS_TOKEN, "consumer-access");
    localStorage.setItem(CONSUMER_REFRESH_TOKEN, "consumer-refresh");
  };

  it("copies the consumer session into the admin keys", () => {
    seedConsumerSession();

    expect(adoptConsumerSession(EMBEDDED)).toBe(true);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBe("consumer-access");
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN)).toBe("consumer-refresh");
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED)).toBe("true");
  });

  it("leaves the consumer session in place", () => {
    seedConsumerSession();
    adoptConsumerSession(EMBEDDED);

    // A copy, not a move — the consumer app must stay signed in.
    expect(localStorage.getItem(CONSUMER_ACCESS_TOKEN)).toBe("consumer-access");
    expect(localStorage.getItem(CONSUMER_REFRESH_TOKEN)).toBe("consumer-refresh");
  });

  it("does not clobber an existing admin session", () => {
    seedConsumerSession();
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "already-signed-in");

    expect(adoptConsumerSession(EMBEDDED)).toBe(false);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBe("already-signed-in");
  });

  it("does nothing when the consumer session is half-present", () => {
    localStorage.setItem(CONSUMER_ACCESS_TOKEN, "consumer-access");

    expect(adoptConsumerSession(EMBEDDED)).toBe(false);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBeNull();
  });

  it("does nothing on the standalone surface", () => {
    seedConsumerSession();

    expect(adoptConsumerSession(STANDALONE)).toBe(false);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBeNull();
  });

  it("defaults to this build's surface, which is standalone under test", () => {
    seedConsumerSession();

    expect(adoptConsumerSession()).toBe(false);
  });
});
