import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
});

const { permissionsRef } = vi.hoisted(() => ({ permissionsRef: { current: [] as string[] } }));

vi.mock("socket.io-client", async () => {
  const { createFakeIo } = await import("./fakeSocket");
  return { io: createFakeIo() };
});
vi.mock("@hooks/useUser", () => ({
  useUser: () => ({ permissions: permissionsRef.current, user: { id: 42, roles: [] } }),
}));

import { HelplineSubNav } from "../components/HelplineSubNav";
import { fetchMock, makeStore, resetKit, renderWorkspace } from "./helplineTestKit";

const LISTENER = ["view:helpline:lobby", "view:helpline:chat"];
const SUPERVISOR = [
  ...LISTENER,
  "view:helpline:monitor",
  "view:helpline:qa",
  "edit:helpline:transfer",
];
const ADMIN = [...SUPERVISOR, "edit:helpline:team"];

const tabs = () =>
  within(screen.getByRole("navigation", { name: "Helpline sections" }))
    .getAllByRole("link")
    .map(link => [link.textContent, link.getAttribute("href")]);

describe("HelplineSubNav", () => {
  beforeEach(() => {
    resetKit();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const renderNav = (permissions: string[]) => {
    permissionsRef.current = permissions;
    renderWorkspace(makeStore(), <HelplineSubNav />, { path: "/helpline", url: "/helpline" });
  };

  it("a listener: Lobby, History and their own feedback", () => {
    renderNav(LISTENER);
    expect(tabs()).toEqual([
      ["Lobby", "/helpline"],
      ["History", "/helpline/history"],
      ["My feedback", "/helpline/qa"],
    ]);
  });

  it("a supervisor adds Monitor, and QA becomes Quality", () => {
    renderNav(SUPERVISOR);
    expect(tabs()).toEqual([
      ["Lobby", "/helpline"],
      ["History", "/helpline/history"],
      ["Monitor", "/helpline/monitor"],
      ["Quality", "/helpline/qa"],
    ]);
  });

  it("a tenant admin adds Team", () => {
    renderNav(ADMIN);
    expect(tabs().map(([label]) => label)).toEqual([
      "Lobby",
      "History",
      "Monitor",
      "Quality",
      "Team",
    ]);
  });
});
