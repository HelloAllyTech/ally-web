import { describe, it, expect } from "vitest";

import { classifyDisconnect } from "./constants";

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
