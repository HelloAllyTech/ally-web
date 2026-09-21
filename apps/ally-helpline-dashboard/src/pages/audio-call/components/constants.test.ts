import { describe, it, expect } from "vitest";

import { SocketDisconnectionReasons } from "@constants";

import { classifyDisconnect, classifyMicrophoneError } from "./constants";

describe("classifyDisconnect", () => {
  it("ignores an intentional client disconnect (normal end)", () => {
    expect(classifyDisconnect("io client disconnect")).toBe("ignore");
  });

  it("treats socket.io auto-recoverable drops as reconnecting", () => {
    expect(classifyDisconnect("transport close")).toBe("reconnecting");
    expect(classifyDisconnect("ping timeout")).toBe("reconnecting");
    expect(classifyDisconnect("transport error")).toBe("reconnecting");
  });

  it("treats an unknown/absent reason as reconnecting (socket.io still retries)", () => {
    expect(classifyDisconnect(undefined)).toBe("reconnecting");
    expect(classifyDisconnect("")).toBe("reconnecting");
  });

  it("treats a server-forced disconnect as terminal", () => {
    expect(classifyDisconnect("io server disconnect")).toBe("terminal");
  });
});

describe("classifyMicrophoneError", () => {
  it("treats a denied or dismissed permission prompt as blocked", () => {
    expect(classifyMicrophoneError({ name: "NotAllowedError" })).toBe(
      SocketDisconnectionReasons.MICROPHONE_BLOCKED,
    );
    expect(classifyMicrophoneError({ name: "SecurityError" })).toBe(
      SocketDisconnectionReasons.MICROPHONE_BLOCKED,
    );
  });

  it("treats a missing or busy device as unavailable", () => {
    expect(classifyMicrophoneError({ name: "NotFoundError" })).toBe(
      SocketDisconnectionReasons.MICROPHONE_UNAVAILABLE,
    );
    expect(classifyMicrophoneError({ name: "NotReadableError" })).toBe(
      SocketDisconnectionReasons.MICROPHONE_UNAVAILABLE,
    );
  });

  it("falls back to unavailable for anything it cannot name", () => {
    expect(classifyMicrophoneError(new Error("boom"))).toBe(
      SocketDisconnectionReasons.MICROPHONE_UNAVAILABLE,
    );
    expect(classifyMicrophoneError(undefined)).toBe(
      SocketDisconnectionReasons.MICROPHONE_UNAVAILABLE,
    );
  });
});
