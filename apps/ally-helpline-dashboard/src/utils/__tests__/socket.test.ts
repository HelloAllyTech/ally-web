import { describe, it, expect } from "vitest";

import { SocketConnectionTypes } from "@constants";

import { getPathForConnectionType } from "../socket";

describe("socket utils", () => {
  describe("getPathForConnectionType", () => {
    it("should return correct path for WEBRTC_AUDIO_CALL", () => {
      const result = getPathForConnectionType(SocketConnectionTypes.WEBRTC_AUDIO_CALL);
      expect(result).toBe("webrtc-audio-chat");
    });

    it("should return correct path for MICROPHONE_MODE", () => {
      const result = getPathForConnectionType(SocketConnectionTypes.MICROPHONE_MODE);
      expect(result).toBe("microphone-chat");
    });

    it("should return correct path for CLOUD_TELEPHONY_CHAT", () => {
      const result = getPathForConnectionType(SocketConnectionTypes.CLOUD_TELEPHONY_CHAT);
      expect(result).toBe("cloud-telephony-chat");
    });
  });
});
