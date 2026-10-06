import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { enabledQuery, permissionsRef } = vi.hoisted(() => ({
  enabledQuery: vi.fn(),
  permissionsRef: { current: [] as string[] },
}));

vi.mock("@api", () => ({ useGetHelplineEnabledQuery: enabledQuery }));
vi.mock("@hooks", () => ({ useUser: () => ({ permissions: permissionsRef.current }) }));

import { useCanUseTextHelpline } from "../useCanUseTextHelpline";

describe("useCanUseTextHelpline", () => {
  beforeEach(() => {
    enabledQuery.mockReset();
    enabledQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  it("never asks about the org toggle without a helpline permission", () => {
    permissionsRef.current = ["edit:scenario-session"];
    const { result } = renderHook(() => useCanUseTextHelpline());

    expect(enabledQuery).toHaveBeenCalledWith(undefined, { skip: true });
    expect(result.current.canView).toBe(false);
    expect(result.current.hasPermission).toBe(false);
  });

  it("is false when the organisation's helpline is off, even with the permission", () => {
    permissionsRef.current = ["view:helpline:lobby"];
    enabledQuery.mockReturnValue({ data: false, isLoading: false });
    const { result } = renderHook(() => useCanUseTextHelpline());

    expect(enabledQuery).toHaveBeenCalledWith(undefined, { skip: false });
    expect(result.current.canView).toBe(false);
    expect(result.current.hasPermission).toBe(true);
  });

  it("fails closed while the toggle is loading or errored", () => {
    permissionsRef.current = ["view:helpline:lobby"];
    enabledQuery.mockReturnValue({ data: undefined, isLoading: true });
    expect(renderHook(() => useCanUseTextHelpline()).result.current).toMatchObject({
      canView: false,
      isLoading: true,
    });
  });

  it("is true with a listener permission and the toggle on", () => {
    permissionsRef.current = ["view:helpline:lobby"];
    enabledQuery.mockReturnValue({ data: true, isLoading: false });
    expect(renderHook(() => useCanUseTextHelpline()).result.current).toMatchObject({
      canView: true,
      canListen: true,
      canMonitor: false,
    });
  });

  it("counts a supervisor's monitor permission as a way in", () => {
    permissionsRef.current = ["view:helpline:monitor"];
    enabledQuery.mockReturnValue({ data: true, isLoading: false });
    expect(renderHook(() => useCanUseTextHelpline()).result.current).toMatchObject({
      canView: true,
      canMonitor: true,
    });
  });
});
