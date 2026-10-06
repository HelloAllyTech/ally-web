import { describe, expect, it } from "vitest";

import {
  claimBlockReason,
  effectiveCapacity,
  openRiskFlags,
  skillLabelKey,
  upsertRiskFlag,
  upsertStaffMessage,
} from "../utils";
import { chatDetail, lobbyEntry, meDto, riskFlag, staffMessage } from "./helplineTestKit";

describe("helpline workspace utils", () => {
  it("upsertStaffMessage replaces by id or by our own clientMessageId, and keeps server order", () => {
    const draft = chatDetail({ messages: [staffMessage({ id: 1 }), staffMessage({ id: 5 })] });
    upsertStaffMessage(draft, staffMessage({ id: 3, content: "middle" }));
    upsertStaffMessage(draft, staffMessage({ id: 5, content: "edited" }));
    expect(draft.messages.map(message => message.id)).toEqual([1, 3, 5]);
    expect(draft.messages[2].content).toBe("edited");

    const withEcho = chatDetail({ messages: [staffMessage({ id: 7, clientMessageId: "c-1" })] });
    upsertStaffMessage(withEcho, staffMessage({ id: 7, clientMessageId: "c-1", content: "same" }));
    expect(withEcho.messages).toHaveLength(1);
  });

  it("upsertRiskFlag raises the chat's risk level but never lowers it", () => {
    const draft = chatDetail();
    upsertRiskFlag(draft, riskFlag({ id: "a", level: "HIGH" }));
    upsertRiskFlag(draft, riskFlag({ id: "b", level: "ELEVATED" }));
    expect(draft.chat.riskLevel).toBe("HIGH");
    expect(draft.riskFlags).toHaveLength(2);
  });

  it("openRiskFlags drops acknowledged flags and puts HIGH first", () => {
    const flags = openRiskFlags([
      riskFlag({ id: "elevated", level: "ELEVATED", createdAt: "2026-10-05T10:09:00Z" }),
      riskFlag({ id: "done", acknowledgedAt: "2026-10-05T10:07:00Z", outcome: "CONFIRMED" }),
      riskFlag({ id: "high", level: "HIGH", createdAt: "2026-10-05T10:01:00Z" }),
    ]);
    expect(flags.map(flag => flag.id)).toEqual(["high", "elevated"]);
  });

  it("caps a listener at the lower of their own limit and the org's", () => {
    expect(effectiveCapacity(meDto())).toBe(2);
    expect(
      effectiveCapacity(meDto({ profile: { ...meDto().profile, maxConcurrentChats: 9 } })),
    ).toBe(3);
  });

  it("explains every reason Claim is blocked", () => {
    expect(claimBlockReason(lobbyEntry(), meDto(), false)).toBe("permission");
    expect(claimBlockReason(lobbyEntry(), meDto({ presence: "AWAY" }), true)).toBe("away");
    expect(claimBlockReason(lobbyEntry({ targetListenerId: 7 }), meDto(), true)).toBe("targeted");
    expect(claimBlockReason(lobbyEntry({ targetListenerId: 42 }), meDto(), true)).toBeNull();
    expect(claimBlockReason(lobbyEntry(), meDto({ activeChatCount: 2 }), true)).toBe("capacity");
    expect(claimBlockReason(lobbyEntry(), meDto(), true)).toBeNull();
  });

  it("labels only known skill keys", () => {
    expect(skillLabelKey("harm")).toBe("helplineWorkspace.skills.harm");
    expect(skillLabelKey("made_up")).toBeNull();
  });
});
