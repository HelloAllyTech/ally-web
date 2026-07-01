import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture the args the RTK query hook is called with so we can assert the
// skip logic without a real store.
const mockQuery = vi.fn();
let mockPermissions: string[] = [];

vi.mock("@api", () => ({
  useGetScribeNoteCreationEnabledQuery: (arg: unknown, opts: unknown) => mockQuery(arg, opts),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector: (state: any) => unknown) =>
    selector({ user: { permissions: mockPermissions } }),
}));

vi.mock("@constants", () => ({
  Permissions: { COUNSELOR_ACCESS: "counselor:access" },
}));

vi.mock("@utils", () => ({
  hasPermissions: (permissions: string[] | null | undefined, required: string) =>
    Array.isArray(permissions) && permissions.includes(required),
}));

vi.mock("@store", () => ({}));

import { useScribeNoteCreationEnabled } from "../useScribeNoteCreationEnabled";

describe("useScribeNoteCreationEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReturnValue({ data: undefined });
  });

  it("queries (skip: false) when the user has counsellor access", () => {
    mockPermissions = ["counselor:access"];
    renderHook(() => useScribeNoteCreationEnabled());
    expect(mockQuery).toHaveBeenCalledWith(undefined, { skip: false });
  });

  it("skips the query when the user is not a counsellor", () => {
    mockPermissions = ["view:audio-upload-url"];
    renderHook(() => useScribeNoteCreationEnabled());
    expect(mockQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });

  it("honours an explicit skip even for a counsellor", () => {
    mockPermissions = ["counselor:access"];
    renderHook(() => useScribeNoteCreationEnabled({ skip: true }));
    expect(mockQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });
});
