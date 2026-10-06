import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
});

const { permissionsRef, toastMock } = vi.hoisted(() => ({
  permissionsRef: { current: [] as string[] },
  toastMock: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));

vi.mock("socket.io-client", async () => {
  const { createFakeIo } = await import("./fakeSocket");
  return { io: createFakeIo() };
});
vi.mock("@hooks/useAnalytics", () => ({ useAnalytics: () => ({ track: vi.fn() }) }));
vi.mock("@hooks/useUser", () => ({
  useUser: () => ({ permissions: permissionsRef.current, user: { id: 42, roles: ["ADMIN"] } }),
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import type { TeamMemberDto } from "@types";

import { HelplineTeam } from "../HelplineTeam";
import {
  fetchMock,
  fetchRoutes,
  json,
  makeStore,
  meDto,
  requests,
  resetKit,
  renderWorkspace,
  seed,
  type TestStore,
} from "./helplineTestKit";

const member = (overrides: Partial<TeamMemberDto>): TeamMemberDto => ({
  userId: 1,
  name: "Someone",
  email: "someone@example.test",
  isListener: false,
  isSupervisor: false,
  isAdmin: false,
  ...overrides,
});

const TEAM = [
  member({
    userId: 42,
    name: "Asha Admin",
    email: "asha@example.test",
    isAdmin: true,
    isSupervisor: true,
  }),
  member({ userId: 7, name: "Meera", email: "meera@example.test", isListener: true }),
  member({ userId: 8, name: "Zoya", email: "zoya@example.test" }),
];

const renderTeam = (store: TestStore) =>
  renderWorkspace(store, <HelplineTeam />, { path: "/helpline/team", url: "/helpline/team" });

/** Resolves a request when the test says so, to observe the optimistic state in between. */
const deferred = () => {
  let resolve: (response: Response) => void = () => undefined;
  const promise = new Promise<Response>(done => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("HelplineTeam", () => {
  let store: TestStore;

  beforeEach(() => {
    resetKit();
    toastMock.error.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    store = makeStore();
    seed(store, { me: meDto() });
    permissionsRef.current = ["view:helpline:lobby", "edit:helpline:team"];
    fetchRoutes["GET /v1/helpline/team"] = request => {
      const search = new URL(request.url).searchParams.get("search");
      return json({
        items: search ? TEAM.filter(item => item.name.toLowerCase().includes(search)) : TEAM,
      });
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("explains who can do what, and fixes an admin's switches", async () => {
    renderTeam(store);
    expect(screen.getByTestId("team-explainer")).toHaveTextContent(
      "Everything a listener can do, plus: monitors live chats, whispers to listeners",
    );
    const admin = await screen.findByTestId("team-row-42");
    expect(within(admin).getByText("Admin")).toBeInTheDocument();
    expect(within(admin).getByRole("switch", { name: "Supervisor: Asha Admin" })).toBeDisabled();
    expect(within(admin).getByRole("switch", { name: "Supervisor: Asha Admin" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(admin).getByRole("switch", { name: "Listener: Asha Admin" })).toBeDisabled();
  });

  it("a switch moves at once and stays when the server agrees", async () => {
    const pending = deferred();
    fetchRoutes["PUT /v1/helpline/team/8"] = () => pending.promise;
    renderTeam(store);

    const toggle = await screen.findByRole("switch", { name: "Listener: Zoya" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    // Optimistic: before the server has answered.
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    expect(requests("PUT", "/v1/helpline/team/8")).toHaveLength(1);
    const [[request]] = requests("PUT", "/v1/helpline/team/8");
    expect(await (request as Request).clone().json()).toEqual({
      listener: true,
      supervisor: false,
    });

    pending.resolve(
      json(member({ userId: 8, name: "Zoya", email: "zoya@example.test", isListener: true })),
    );
    await waitFor(() => expect(requests("PUT", "/v1/helpline/team/8")).toHaveLength(1));
    expect(screen.getByRole("switch", { name: "Listener: Zoya" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("rolls back and says so when the server refuses", async () => {
    const pending = deferred();
    fetchRoutes["PUT /v1/helpline/team/7"] = () => pending.promise;
    renderTeam(store);

    const supervisor = await screen.findByRole("switch", { name: "Supervisor: Meera" });
    fireEvent.click(supervisor);
    await waitFor(() => expect(supervisor).toHaveAttribute("aria-checked", "true"));
    // Supervisor includes listening, so Listener reads on and is fixed meanwhile.
    expect(screen.getByRole("switch", { name: "Listener: Meera" })).toBeDisabled();

    pending.resolve(json({ statusCode: 500, message: "boom" }, 500));
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Supervisor: Meera" })).toHaveAttribute(
        "aria-checked",
        "false",
      ),
    );
    expect(toastMock.error).toHaveBeenCalledWith(
      "Couldn't update Meera. Their access hasn't changed.",
    );
  });

  it("says when a search finds nobody", async () => {
    renderTeam(store);
    await screen.findByTestId("team-row-7");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search people" }), {
      target: { value: "nobody" },
    });
    expect(await screen.findByTestId("team-empty")).toHaveTextContent("No one matches “nobody”.");
  });

  it("is for tenant admins only", () => {
    permissionsRef.current = ["view:helpline:lobby", "view:helpline:monitor"];
    renderTeam(store);
    expect(screen.getByText("Team is for your organisation's admins.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
