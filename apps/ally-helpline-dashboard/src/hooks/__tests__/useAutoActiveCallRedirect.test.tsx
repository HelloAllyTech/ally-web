import React from "react";

import { render } from "@testing-library/react";
import { useNavigate, useLocation } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ROUTES, SocketConnectionTypes } from "@constants";

import { useSessionManager } from "..";
import { useAutoActiveCallRedirect } from "../useAutoActiveCallRedirect";

vi.mock("react-router-dom", () => {
  const actual = vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useLocation: vi.fn(() => ({ pathname: "/", search: "", hash: "", state: null, key: "k" })),
  };
});

vi.mock("..", () => ({
  useSessionManager: vi.fn(() => ({
    activeSession: null,
    disconnectAll: vi.fn(),
  })),
}));

const TestComponent = ({ isAuthenticated = true }: { isAuthenticated?: boolean }) => {
  useAutoActiveCallRedirect(isAuthenticated);
  return null;
};

describe("useAutoActiveCallRedirect", () => {
  const useNavigateMock = vi.mocked(useNavigate);
  const useLocationMock = vi.mocked(useLocation);
  const useSessionManagerMock = vi.mocked(useSessionManager);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to cloud telephony when session type is CLOUD_TELEPHONY_CHAT", () => {
    const navigateSpy = vi.fn();
    useNavigateMock.mockReturnValue(navigateSpy);
    useLocationMock.mockReturnValue({
      pathname: "/home",
      search: "",
      hash: "",
      state: null,
      key: "k",
    } as any);

    useSessionManagerMock.mockReturnValue({
      activeSession: { type: SocketConnectionTypes.CLOUD_TELEPHONY_CHAT } as any,
      setSession: vi.fn(),
      clearSession: vi.fn(),
      disconnectAll: vi.fn(),
      getEventCallback: vi.fn(() => ({
        SESSION_CREATED: vi.fn(),
        USER_JOINED: vi.fn(),
        AUDIO_MESSAGE: vi.fn(),
        CHAT_ENDED: vi.fn(),
        USER_DISCONNECTED: vi.fn(),
      })),
    } as any);

    render(<TestComponent />);

    expect(navigateSpy).toHaveBeenCalledWith(`${ROUTES.AUDIO_CALL}?mode=cloud-telephony`);
  });

  it("navigates to microphone mode when session type is MICROPHONE_MODE", () => {
    const navigateSpy = vi.fn();
    useNavigateMock.mockReturnValue(navigateSpy);
    useLocationMock.mockReturnValue({
      pathname: "/home",
      search: "",
      hash: "",
      state: null,
      key: "k",
    } as any);

    useSessionManagerMock.mockReturnValue({
      activeSession: { type: SocketConnectionTypes.MICROPHONE_MODE } as any,
      setSession: vi.fn(),
      clearSession: vi.fn(),
      disconnectAll: vi.fn(),
      getEventCallback: vi.fn(() => ({
        SESSION_CREATED: vi.fn(),
        USER_JOINED: vi.fn(),
        AUDIO_MESSAGE: vi.fn(),
        CHAT_ENDED: vi.fn(),
        USER_DISCONNECTED: vi.fn(),
      })),
    } as any);

    render(<TestComponent />);

    expect(navigateSpy).toHaveBeenCalledWith(`${ROUTES.AUDIO_CALL}?mode=microphone`);
  });

  it("does not navigate if already on audio call route", () => {
    const navigateSpy = vi.fn();
    useNavigateMock.mockReturnValue(navigateSpy);
    useLocationMock.mockReturnValue({
      pathname: ROUTES.AUDIO_CALL,
      search: "",
      hash: "",
      state: null,
      key: "k",
    } as any);

    useSessionManagerMock.mockReturnValue({
      activeSession: { type: SocketConnectionTypes.MICROPHONE_MODE } as any,
      setSession: vi.fn(),
      clearSession: vi.fn(),
      disconnectAll: vi.fn(),
      getEventCallback: vi.fn(() => ({
        SESSION_CREATED: vi.fn(),
        USER_JOINED: vi.fn(),
        AUDIO_MESSAGE: vi.fn(),
        CHAT_ENDED: vi.fn(),
        USER_DISCONNECTED: vi.fn(),
      })),
    } as any);

    render(<TestComponent />);

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("does not navigate if user is not authenticated", () => {
    const navigateSpy = vi.fn();
    useNavigateMock.mockReturnValue(navigateSpy);
    useLocationMock.mockReturnValue({
      pathname: "/home",
      search: "",
      hash: "",
      state: null,
      key: "k",
    } as any);

    useSessionManagerMock.mockReturnValue({
      activeSession: { type: SocketConnectionTypes.MICROPHONE_MODE } as any,
      setSession: vi.fn(),
      clearSession: vi.fn(),
      disconnectAll: vi.fn(),
      getEventCallback: vi.fn(() => ({
        SESSION_CREATED: vi.fn(),
        USER_JOINED: vi.fn(),
        AUDIO_MESSAGE: vi.fn(),
        CHAT_ENDED: vi.fn(),
        USER_DISCONNECTED: vi.fn(),
      })),
    } as any);

    render(<TestComponent isAuthenticated={false} />);

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
