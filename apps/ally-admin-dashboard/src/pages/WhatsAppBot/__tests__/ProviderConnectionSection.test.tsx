import React from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WaConnectionCheck, WaProviderHealth } from "@types";

/**
 * The Connection section exists to make "is the bot actually reachable?" answerable from the
 * screen. Each assertion here is a way it could say "fine" while the bot is dead, or offer a Meta
 * action the number does not need.
 */

const checkMock = vi.fn();
const registerMock = vi.fn();
const subscribeMock = vi.fn();

const asMutation = (fn: ReturnType<typeof vi.fn>) => () =>
  [(arg?: unknown) => ({ unwrap: () => fn(arg) }), { isLoading: false }] as const;

vi.mock("@api", () => ({
  useCheckWaProviderConnectionMutation: asMutation(checkMock),
  useRegisterWaPhoneNumberMutation: asMutation(registerMock),
  useSubscribeWaProviderAppMutation: asMutation(subscribeMock),
}));

// The barrel pulls the whole app (store, api slice, table constants) in at import time; the
// strings file is self-contained and is the only part this component reads.
vi.mock("@constants", async () => ({ en: (await import("../../../constants/en")).en }));

vi.mock("@components", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary" },
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  InlineNotification: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div role="status">
      {title}
      {subtitle ? ` — ${subtitle}` : ""}
    </div>
  ),
  TextInput: ({
    id,
    value,
    onChange,
    placeholder,
  }: {
    id: string;
    value: string;
    placeholder?: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => <input id={id} aria-label={placeholder} value={value} onChange={onChange} />,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { en } = await import("@constants");
const { ProviderConnectionSection } = await import("../ProviderConnectionSection");
const t = en.whatsappBot.settings;

const health: WaProviderHealth = {
  enabled: false,
  provider: "meta",
  verifyTokenConfigured: true,
  appSecretConfigured: true,
  phoneNumberIdConfigured: true,
  accessTokenConfigured: true,
  inboundQueueConfigured: true,
  businessAccountIdConfigured: true,
  inboundDlqConfigured: true,
  kbIngestQueueConfigured: true,
  helplineNumbersSet: false,
  mappedNumbers: 0,
  indexedDocuments: 12,
};

const connected: WaConnectionCheck = {
  ok: true,
  phoneNumber: {
    displayPhoneNumber: "+91 98000 00000",
    verifiedName: "Ally",
    platformType: "CLOUD_API",
  },
  subscribedApps: ["Ally Bot"],
};

const runCheck = async (result: WaConnectionCheck) => {
  checkMock.mockResolvedValueOnce(result);
  fireEvent.click(screen.getByRole("button", { name: t.checkButton }));
  await screen.findByText(result.ok ? t.checkOk : t.checkNotOk, { exact: false });
};

describe("ProviderConnectionSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the webhook URL Meta must be given, on the API origin", () => {
    render(<ProviderConnectionSection health={health} />);
    expect(screen.getByText(/\/api\/v1\/webhook\/whatsapp$/)).toBeTruthy();
  });

  it("does not call Meta until asked", () => {
    render(<ProviderConnectionSection health={health} />);
    expect(checkMock).not.toHaveBeenCalled();
  });

  it("flags the readiness gaps that leave the bot up but useless", () => {
    render(<ProviderConnectionSection health={health} />);
    // No helpline in crisis replies, and no mapped numbers means every worker is refused.
    expect(screen.getByText(t.readinessMappedHelp)).toBeTruthy();
    expect(screen.queryByText(t.readinessDocumentsHelp)).toBeNull();
    expect(screen.getByText(t.readinessNo)).toBeTruthy();
  });

  it("renders unknown, not missing, for fields an older backend does not send", () => {
    render(
      <ProviderConnectionSection
        health={{ ...health, kbIngestQueueConfigured: undefined, mappedNumbers: undefined }}
      />,
    );
    expect(screen.queryByText(t.readinessMappedHelp)).toBeNull();
  });

  it("shows Meta's reason when the connection is refused", async () => {
    render(<ProviderConnectionSection health={health} />);
    await runCheck({ ok: false, error: "Meta rejected the phone number lookup: token expired" });
    expect(screen.getByText(/token expired/)).toBeTruthy();
  });

  it("offers registration only for a number Meta says is unregistered", async () => {
    render(<ProviderConnectionSection health={health} />);
    await runCheck(connected);
    expect(screen.queryByRole("button", { name: t.registerButton })).toBeNull();

    await runCheck({
      ...connected,
      phoneNumber: { ...connected.phoneNumber, platformType: "NOT_APPLICABLE" },
    });
    expect(screen.getByRole("button", { name: t.registerButton })).toBeTruthy();
  });

  it("sends a six-digit PIN and nothing else", async () => {
    render(<ProviderConnectionSection health={health} />);
    await runCheck({
      ...connected,
      phoneNumber: { ...connected.phoneNumber, platformType: "NOT_APPLICABLE" },
    });

    const button = screen.getByRole("button", { name: t.registerButton }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText(t.pinLabel), { target: { value: "12a34" } });
    expect(button.disabled).toBe(true);

    registerMock.mockResolvedValueOnce(connected);
    fireEvent.change(screen.getByLabelText(t.pinLabel), { target: { value: "123456" } });
    fireEvent.click(button);
    await waitFor(() => expect(registerMock).toHaveBeenCalledWith({ pin: "123456" }));
  });

  it("offers the subscription fix when no app is subscribed", async () => {
    render(<ProviderConnectionSection health={health} />);
    await runCheck({ ...connected, subscribedApps: [] });
    expect(screen.getByText(t.subscriptionNone)).toBeTruthy();

    subscribeMock.mockResolvedValueOnce(connected);
    fireEvent.click(screen.getByRole("button", { name: t.subscribeButton }));
    await waitFor(() => expect(subscribeMock).toHaveBeenCalled());
  });

  it('never reads an unchecked subscription as "not subscribed"', async () => {
    render(<ProviderConnectionSection health={health} />);
    await runCheck({ ...connected, subscribedApps: null });
    expect(screen.getByText(t.subscriptionUnchecked)).toBeTruthy();
    expect(screen.queryByRole("button", { name: t.subscribeButton })).toBeNull();
  });
});
