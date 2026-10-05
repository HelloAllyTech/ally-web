import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { en } from "@src/constants";
import { HelplineAdminSettingsDto, HelplineSettings } from "@src/types";

import { TextHelplineSettings } from "../TextHelplineSettings";

const { mockQuery, mockUpdate, mockRefetch, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockUpdate: vi.fn(),
  mockRefetch: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: mockToastSuccess, error: mockToastError } }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children, label }: any) => <span data-tooltip={label}>{children}</span>,
}));

vi.mock("@src/assets", () => ({ TooltipIcon: () => <svg /> }));

// The real copy, but not the real `@src/constants` barrel: it pulls in the whole component tree
// (SimulationCreator imports from `@components`), which needs a real `@src/api`.
vi.mock("@src/constants", async () => ({
  en: (await import("@src/constants/en")).en,
}));

vi.mock("@src/api", () => ({
  useGetHelplineAdminSettingsQuery: (tenantId: string) => mockQuery(tenantId),
  useUpdateHelplineAdminSettingsMutation: () => [mockUpdate, { isLoading: false }],
}));

const text = en.textHelpline;

const buildSettings = (overrides: Partial<HelplineSettings> = {}): HelplineSettings => ({
  retentionDays: 90,
  hours: null,
  languages: ["en", "hi"],
  allowQueueWhenNoListeners: false,
  maxWaitMinutes: 30,
  idleEndMinutes: 15,
  maxWaitingTalkers: 50,
  orgMaxConcurrentPerListener: 3,
  emergencyResources: { en: "Call 112 in an emergency.", hi: "आपातकाल में 112 पर कॉल करें।" },
  closingMessage: {},
  escalationChecklist: ["Ask directly about suicide", "Share the emergency resources"],
  supervisorAlertChannels: { inApp: true, push: true, slackWebhookUrl: null },
  listenerSupportContact: null,
  ageNotice: null,
  copilot: { suggestions: true, nudges: true, riskClassifier: true, rollingSummaryEveryTurns: 4 },
  riskHighConfidence: 0.7,
  summaryFields: [
    { key: "presenting_concern", label: "Presenting concern", description: "Why they came" },
  ],
  ...overrides,
});

const buildDto = (overrides: Partial<HelplineAdminSettingsDto> = {}): HelplineAdminSettingsDto => ({
  tenantId: "tenant-uuid",
  tenantCode: "acme",
  enabled: false,
  settings: buildSettings(),
  defaults: buildSettings({
    emergencyResources: { en: "Default English resources", hi: "Default Hindi resources" },
  }),
  publicPath: "/talk/acme",
  ...overrides,
});

const loaded = (dto: HelplineAdminSettingsDto = buildDto()) =>
  mockQuery.mockReturnValue({
    data: dto,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: mockRefetch,
  });

/** A PUT that succeeds and echoes the saved settings back, as the real route does. */
const updateSucceeds = () =>
  mockUpdate.mockImplementation((body: any) => ({
    unwrap: () =>
      Promise.resolve(buildDto({ settings: { ...buildSettings(), ...(body.settings ?? {}) } })),
  }));

const renderSettings = () => render(<TextHelplineSettings tenantId="acme" />);

const saveButton = () => screen.getByRole("button", { name: text.save });
const discardButton = () => screen.getByRole("button", { name: text.discard });
const enableSwitch = () => screen.getByRole("button", { name: text.enableLabel });

const setValue = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("TextHelplineSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loaded();
    updateSucceeds();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("loading and error states", () => {
    it("shows a loading state, not an empty form, while the settings load", () => {
      mockQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false });
      renderSettings();

      expect(screen.getByText(text.loading)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: text.save })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: text.enableLabel })).not.toBeInTheDocument();
    });

    it("shows an error with the server's reason and a Retry that refetches", () => {
      mockQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { data: { message: "Organisation not found" } },
        refetch: mockRefetch,
      });
      renderSettings();

      expect(screen.getByText(text.loadFailed)).toBeInTheDocument();
      expect(screen.getByText("Organisation not found")).toBeInTheDocument();
      expect(screen.queryByText(text.loading)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: text.save })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: text.retry }));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it("asks for the organisation it was given", () => {
      renderSettings();
      expect(mockQuery).toHaveBeenCalledWith("acme");
    });
  });

  describe("public link", () => {
    const writeText = vi.fn();

    beforeEach(() => {
      writeText.mockReset().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
    });

    it("builds the link from the consumer app origin and the server's publicPath", () => {
      vi.stubEnv("VITE_IMPERSONATION_APP_URL", "https://consumer.example.test/");
      renderSettings();

      expect(screen.getByLabelText(text.publicLinkLabel)).toHaveValue(
        "https://consumer.example.test/talk/acme",
      );
      const open = screen.getByRole("link", { name: text.openLink });
      expect(open).toHaveAttribute("href", "https://consumer.example.test/talk/acme");
      expect(open).toHaveAttribute("target", "_blank");
      expect(open).toHaveAttribute("rel", "noopener noreferrer");
      expect(screen.getByText(text.publicLinkNote)).toBeInTheDocument();
    });

    it("falls back to the production consumer app when no origin is configured", () => {
      vi.stubEnv("VITE_IMPERSONATION_APP_URL", "");
      renderSettings();

      expect(screen.getByLabelText(text.publicLinkLabel)).toHaveValue(
        "https://app.helloally.ai/talk/acme",
      );
    });

    it("copies the link to the clipboard and says so", async () => {
      vi.stubEnv("VITE_IMPERSONATION_APP_URL", "https://consumer.example.test");
      renderSettings();

      fireEvent.click(screen.getByRole("button", { name: text.copyLink }));

      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith("https://consumer.example.test/talk/acme"),
      );
      await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(text.linkCopied));
    });

    it("tells the admin when the clipboard is unavailable", async () => {
      writeText.mockRejectedValue(new Error("denied"));
      renderSettings();

      fireEvent.click(screen.getByRole("button", { name: text.copyLink }));

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(text.linkCopyFailed));
      expect(mockToastSuccess).not.toHaveBeenCalled();
    });
  });

  describe("enable switch", () => {
    it("explains what turning it off does, in place", () => {
      renderSettings();

      const tips = Array.from(document.querySelectorAll("[data-tooltip]")).map(el =>
        el.getAttribute("data-tooltip"),
      );
      expect(tips).toContain(text.enableHint);
      expect(text.enableHint).toMatch(/chats already open finish normally/);
    });

    it("shows the saved state", () => {
      loaded(buildDto({ enabled: true }));
      renderSettings();
      expect(screen.getByText(en.common.enabled)).toBeInTheDocument();
    });

    it("turns the helpline on with a PUT of only { tenantId, enabled }", async () => {
      renderSettings();
      expect(screen.getByText(en.common.disabled)).toBeInTheDocument();

      fireEvent.click(enableSwitch());

      await waitFor(() =>
        expect(mockUpdate).toHaveBeenCalledWith({ tenantId: "acme", enabled: true }),
      );
      await waitFor(() => expect(screen.getByText(en.common.enabled)).toBeInTheDocument());
    });

    it("rolls the switch back and shows the server's reason when the PUT is refused", async () => {
      mockUpdate.mockReturnValue({
        unwrap: () => Promise.reject({ data: { message: "Forbidden resource" } }),
      });
      renderSettings();

      fireEvent.click(enableSwitch());

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("Forbidden resource"));
      expect(screen.getByText(en.common.disabled)).toBeInTheDocument();
      expect(screen.queryByText(en.common.enabled)).not.toBeInTheDocument();
    });

    it("falls back to a generic message when the failure carries none", async () => {
      mockUpdate.mockReturnValue({ unwrap: () => Promise.reject(new Error("network")) });
      renderSettings();

      fireEvent.click(enableSwitch());

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(text.enableFailed));
      expect(screen.getByText(en.common.disabled)).toBeInTheDocument();
    });
  });

  describe("save bar", () => {
    it("keeps Save and Discard disabled until something changes", () => {
      renderSettings();

      expect(saveButton()).toBeDisabled();
      expect(discardButton()).toBeDisabled();
      expect(screen.queryByText(text.unsavedChanges)).not.toBeInTheDocument();
    });

    it("enables them on an edit and Discard puts the saved value back", () => {
      renderSettings();

      setValue(text.availability.maxWaitMinutes, "45");
      expect(saveButton()).toBeEnabled();
      expect(screen.getByText(text.unsavedChanges)).toBeInTheDocument();

      fireEvent.click(discardButton());

      expect(screen.getByLabelText(text.availability.maxWaitMinutes)).toHaveValue(30);
      expect(saveButton()).toBeDisabled();
    });

    it("does not call that a change when an edit is undone", () => {
      renderSettings();

      setValue(text.availability.maxWaitMinutes, "45");
      setValue(text.availability.maxWaitMinutes, "30");

      expect(saveButton()).toBeDisabled();
    });

    it("saves an edit with { tenantId, settings } and confirms", async () => {
      renderSettings();

      setValue(text.availability.maxWaitMinutes, "45");
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      const body = mockUpdate.mock.calls[0][0];
      expect(body.tenantId).toBe("acme");
      expect(body.settings.maxWaitMinutes).toBe(45);
      // The full form goes, not a patch of one field, and never the enable flag.
      expect(body.settings.idleEndMinutes).toBe(15);
      expect(body.settings.languages).toEqual(["en", "hi"]);
      expect(body).not.toHaveProperty("enabled");
      await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(text.saved));
    });

    it("surfaces the server's 400 message", async () => {
      mockUpdate.mockReturnValue({
        unwrap: () => Promise.reject({ data: { message: "emergencyResources.en is too long" } }),
      });
      renderSettings();

      setValue(text.availability.maxWaitMinutes, "45");
      fireEvent.click(saveButton());

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith("emergencyResources.en is too long"),
      );
      // The edit is still there to fix and retry.
      expect(screen.getByLabelText(text.availability.maxWaitMinutes)).toHaveValue(45);
    });

    it("joins validation messages that arrive as a list", async () => {
      mockUpdate.mockReturnValue({
        unwrap: () =>
          Promise.reject({
            data: { message: ["maxWaitMinutes must be positive", "idleEndMinutes too big"] },
          }),
      });
      renderSettings();

      setValue(text.availability.maxWaitMinutes, "45");
      fireEvent.click(saveButton());

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith(
          "maxWaitMinutes must be positive idleEndMinutes too big",
        ),
      );
    });

    it("falls back to a generic message when the save fails without one", async () => {
      mockUpdate.mockReturnValue({ unwrap: () => Promise.reject(new Error("network")) });
      renderSettings();

      setValue(text.availability.maxWaitMinutes, "45");
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(text.saveFailed));
    });
  });

  describe("validation blocks the save", () => {
    it("rejects a non-Slack webhook URL inline and does not call the API", async () => {
      renderSettings();

      setValue(text.safety.slackWebhookUrl, "http://example.com");
      expect(screen.queryByText(text.errors.slackWebhookUrl)).not.toBeInTheDocument();

      fireEvent.click(saveButton());

      expect(await screen.findByText(text.errors.slackWebhookUrl)).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalledWith(text.fixErrors(1));
    });

    it("accepts a Slack incoming-webhook URL and clears the error as it is fixed", async () => {
      renderSettings();

      setValue(text.safety.slackWebhookUrl, "http://example.com");
      fireEvent.click(saveButton());
      expect(await screen.findByText(text.errors.slackWebhookUrl)).toBeInTheDocument();

      setValue(text.safety.slackWebhookUrl, "https://hooks.slack.com/services/x");
      expect(screen.queryByText(text.errors.slackWebhookUrl)).not.toBeInTheDocument();

      fireEvent.click(saveButton());

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      expect(mockUpdate.mock.calls[0][0].settings.supervisorAlertChannels).toEqual({
        inApp: true,
        push: true,
        slackWebhookUrl: "https://hooks.slack.com/services/x",
      });
    });

    it("sends an emptied Slack URL as null", async () => {
      loaded(
        buildDto({
          settings: buildSettings({
            supervisorAlertChannels: {
              inApp: true,
              push: true,
              slackWebhookUrl: "https://hooks.slack.com/services/old",
            },
          }),
        }),
      );
      renderSettings();

      setValue(text.safety.slackWebhookUrl, "");
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      expect(
        mockUpdate.mock.calls[0][0].settings.supervisorAlertChannels.slackWebhookUrl,
      ).toBeNull();
    });

    it("requires emergency resources for every offered language", async () => {
      renderSettings();

      setValue(text.talkerText.emergencyResources("Hindi"), "   ");
      fireEvent.click(saveButton());

      expect(
        await screen.findByText(text.errors.emergencyResourcesRequired("Hindi")),
      ).toBeInTheDocument();
      expect(screen.queryByText(text.errors.emergencyResourcesRequired("English"))).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("asks for resources when a language is switched on, and shows the default as a hint", async () => {
      loaded(
        buildDto({
          defaults: buildSettings({
            emergencyResources: { en: "d-en", hi: "d-hi", mr: "Default Marathi resources" },
          }),
        }),
      );
      renderSettings();

      fireEvent.click(screen.getByRole("checkbox", { name: "Marathi" }));

      const box = screen.getByLabelText(text.talkerText.emergencyResources("Marathi"));
      expect(box).toHaveValue("");
      expect(box).toHaveAttribute("placeholder", "Default Marathi resources");

      fireEvent.click(saveButton());
      expect(
        await screen.findByText(text.errors.emergencyResourcesRequired("Marathi")),
      ).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("keeps at least one language on offer", async () => {
      renderSettings();

      fireEvent.click(screen.getByRole("checkbox", { name: "English" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Hindi" }));
      fireEvent.click(saveButton());

      expect(await screen.findByText(text.errors.languagesRequired)).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("sends only the offered languages' text", async () => {
      renderSettings();

      fireEvent.click(screen.getByRole("checkbox", { name: "Hindi" }));
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      const { settings } = mockUpdate.mock.calls[0][0];
      expect(settings.languages).toEqual(["en"]);
      expect(Object.keys(settings.emergencyResources)).toEqual(["en"]);
    });

    it("rejects out-of-range limits next to the field", async () => {
      renderSettings();

      setValue(text.availability.maxWaitMinutes, "500");
      setValue(text.copilot.rollingSummary, "0");
      fireEvent.click(saveButton());

      expect(await screen.findByText(text.errors.wholeNumberBetween(1, 240))).toBeInTheDocument();
      expect(screen.getByText(text.errors.wholeNumberBetween(1, 20))).toBeInTheDocument();
      expect(mockToastError).toHaveBeenCalledWith(text.fixErrors(2));
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("treats an emptied number box as an error, not a zero", async () => {
      renderSettings();

      setValue(text.availability.maxWaitingTalkers, "");
      fireEvent.click(saveButton());

      expect(await screen.findByText(text.errors.wholeNumberBetween(1, 500))).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("keeps the risk threshold between 0.50 and 0.95", async () => {
      renderSettings();

      setValue(text.safety.riskHighConfidence, "0.99");
      fireEvent.click(saveButton());

      expect(
        await screen.findByText(text.errors.numberBetween("0.50", "0.95")),
      ).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();

      setValue(text.safety.riskHighConfidence, "0.8");
      fireEvent.click(saveButton());
      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      expect(mockUpdate.mock.calls[0][0].settings.riskHighConfidence).toBe(0.8);
    });
  });

  describe("retention", () => {
    it("warns, in place, when chats would be kept forever", () => {
      renderSettings();
      expect(screen.queryByText(text.retention.foreverWarning)).not.toBeInTheDocument();

      setValue(text.retention.days, "0");
      expect(screen.getByText(text.retention.foreverWarning)).toBeInTheDocument();

      setValue(text.retention.days, "30");
      expect(screen.queryByText(text.retention.foreverWarning)).not.toBeInTheDocument();
    });

    it("warns on load when the saved value is already 0, and still allows saving 0", async () => {
      loaded(buildDto({ settings: buildSettings({ retentionDays: 0 }) }));
      renderSettings();

      expect(screen.getByText(text.retention.foreverWarning)).toBeInTheDocument();

      setValue(text.availability.maxWaitMinutes, "31");
      fireEvent.click(saveButton());
      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      expect(mockUpdate.mock.calls[0][0].settings.retentionDays).toBe(0);
    });

    it("rejects a negative or fractional number of days", async () => {
      renderSettings();

      setValue(text.retention.days, "-1");
      fireEvent.click(saveButton());
      expect(await screen.findByText(text.errors.wholeNumberAtLeast(0))).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("opening hours", () => {
    it("starts open-whenever and offers the hours editor on request", () => {
      renderSettings();

      expect(screen.getByLabelText(text.availability.alwaysOpen)).toBeChecked();
      expect(screen.queryByLabelText(text.availability.timezone)).not.toBeInTheDocument();

      fireEvent.click(screen.getByLabelText(text.availability.setHours));

      expect(screen.getByLabelText(text.availability.timezone)).toHaveValue("Asia/Kolkata");
      // Monday to Friday start open, the weekend closed.
      expect(screen.getByLabelText("Monday: Open")).toBeChecked();
      expect(screen.getByLabelText("Friday: Open")).toBeChecked();
      expect(screen.getByLabelText("Saturday: Open")).not.toBeChecked();
      expect(screen.getByLabelText(text.availability.opensAt("Monday"))).toHaveValue("09:00");
      expect(screen.getByLabelText(text.availability.closesAt("Monday"))).toHaveValue("17:00");
    });

    it("sends the chosen hours, with day numbers following Date#getDay", async () => {
      renderSettings();

      fireEvent.click(screen.getByLabelText(text.availability.setHours));
      fireEvent.click(screen.getByLabelText("Sunday: Open"));
      fireEvent.change(screen.getByLabelText(text.availability.timezone), {
        target: { value: "UTC" },
      });
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      const { hours } = mockUpdate.mock.calls[0][0].settings;
      expect(hours.tz).toBe("UTC");
      expect(hours.weekly.map((w: any) => w.day)).toEqual([1, 2, 3, 4, 5, 0]);
      expect(hours.weekly[5]).toEqual({ day: 0, open: "09:00", close: "17:00" });
    });

    it("rejects a closing time that is not after the opening time", async () => {
      renderSettings();

      fireEvent.click(screen.getByLabelText(text.availability.setHours));
      fireEvent.change(screen.getByLabelText(text.availability.closesAt("Tuesday")), {
        target: { value: "08:00" },
      });
      fireEvent.click(saveButton());

      expect(await screen.findByText(text.errors.closeAfterOpen("Tuesday"))).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("rejects opening hours with no open day", async () => {
      renderSettings();

      fireEvent.click(screen.getByLabelText(text.availability.setHours));
      for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]) {
        fireEvent.click(screen.getByLabelText(`${day}: Open`));
      }
      fireEvent.click(saveButton());

      expect(await screen.findByText(text.errors.hoursNeedOneDay)).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("returns to open-whenever by sending hours: null", async () => {
      loaded(
        buildDto({
          settings: buildSettings({
            hours: { tz: "Asia/Kolkata", weekly: [{ day: 1, open: "10:00", close: "16:00" }] },
          }),
        }),
      );
      renderSettings();

      fireEvent.click(screen.getByLabelText(text.availability.alwaysOpen));
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      expect(mockUpdate.mock.calls[0][0].settings.hours).toBeNull();
    });

    it("restores the hours a switch away and back would otherwise lose", () => {
      loaded(
        buildDto({
          settings: buildSettings({
            hours: { tz: "UTC", weekly: [{ day: 2, open: "10:00", close: "16:00" }] },
          }),
        }),
      );
      renderSettings();

      fireEvent.click(screen.getByLabelText(text.availability.alwaysOpen));
      fireEvent.click(screen.getByLabelText(text.availability.setHours));

      expect(screen.getByLabelText(text.availability.timezone)).toHaveValue("UTC");
      expect(screen.getByLabelText(text.availability.opensAt("Tuesday"))).toHaveValue("10:00");
    });
  });

  describe("escalation checklist", () => {
    const step = (n: number) => screen.getByLabelText(text.safety.checklistStep(n));

    it("reorders, edits and removes steps", () => {
      renderSettings();
      expect(step(1)).toHaveValue("Ask directly about suicide");

      fireEvent.click(
        screen.getByRole("button", { name: text.safety.stepAction(text.safety.moveDown, 1) }),
      );
      expect(step(1)).toHaveValue("Share the emergency resources");
      expect(step(2)).toHaveValue("Ask directly about suicide");

      fireEvent.change(step(2), { target: { value: "Ask about a plan" } });
      fireEvent.click(
        screen.getByRole("button", { name: text.safety.stepAction(text.safety.remove, 1) }),
      );

      expect(screen.queryByLabelText(text.safety.checklistStep(2))).not.toBeInTheDocument();
      expect(step(1)).toHaveValue("Ask about a plan");
    });

    it("cannot move the first step up or the last one down", () => {
      renderSettings();

      expect(
        screen.getByRole("button", { name: text.safety.stepAction(text.safety.moveUp, 1) }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: text.safety.stepAction(text.safety.moveDown, 2) }),
      ).toBeDisabled();
    });

    it("blocks an empty step and sends the order as arranged", async () => {
      renderSettings();

      fireEvent.click(screen.getByRole("button", { name: text.safety.addStep }));
      fireEvent.click(saveButton());

      expect(await screen.findByText(text.errors.checklistStepEmpty(3))).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();

      fireEvent.change(step(3), { target: { value: "Agree a next step" } });
      fireEvent.click(
        screen.getByRole("button", { name: text.safety.stepAction(text.safety.moveUp, 3) }),
      );
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      expect(mockUpdate.mock.calls[0][0].settings.escalationChecklist).toEqual([
        "Ask directly about suicide",
        "Agree a next step",
        "Share the emergency resources",
      ]);
    });
  });

  describe("summary fields", () => {
    const addField = () =>
      fireEvent.click(screen.getByRole("button", { name: text.summaryFields.add }));

    it("requires a key in snake_case and a label", async () => {
      renderSettings();

      addField();
      fireEvent.click(saveButton());
      expect(await screen.findByText(text.errors.summaryKeyRequired)).toBeInTheDocument();
      expect(screen.getByText(text.errors.summaryLabelRequired)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(text.summaryFields.keyFor(2)), {
        target: { value: "Bad Key" },
      });
      expect(screen.getByText(text.errors.summaryKeyFormat)).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("rejects duplicate keys on both rows", async () => {
      renderSettings();

      addField();
      fireEvent.change(screen.getByLabelText(text.summaryFields.keyFor(2)), {
        target: { value: "presenting_concern" },
      });
      fireEvent.change(screen.getByLabelText(text.summaryFields.labelFor(2)), {
        target: { value: "Again" },
      });
      fireEvent.click(saveButton());

      await waitFor(() =>
        expect(screen.getAllByText(text.errors.summaryKeyDuplicate)).toHaveLength(2),
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("saves a new field and can remove one", async () => {
      renderSettings();

      addField();
      fireEvent.change(screen.getByLabelText(text.summaryFields.keyFor(2)), {
        target: { value: "next_step" },
      });
      fireEvent.change(screen.getByLabelText(text.summaryFields.labelFor(2)), {
        target: { value: "Next step" },
      });
      fireEvent.click(screen.getByRole("button", { name: text.summaryFields.removeField(1) }));
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      expect(mockUpdate.mock.calls[0][0].settings.summaryFields).toEqual([
        { key: "next_step", label: "Next step", description: "" },
      ]);
    });
  });

  describe("talker text and tooltips", () => {
    it("shows a text box per offered language only", () => {
      renderSettings();

      expect(
        screen.getByLabelText(text.talkerText.emergencyResources("English")),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(text.talkerText.closingMessage("Hindi"))).toBeInTheDocument();
      expect(
        screen.queryByLabelText(text.talkerText.emergencyResources("Tamil")),
      ).not.toBeInTheDocument();
    });

    it("uses the platform default as the placeholder where there is one", () => {
      renderSettings();

      expect(screen.getByLabelText(text.talkerText.emergencyResources("English"))).toHaveAttribute(
        "placeholder",
        "Default English resources",
      );
    });

    it("explains the controls that are not obvious from their labels", () => {
      renderSettings();

      const tips = Array.from(document.querySelectorAll("[data-tooltip]")).map(el =>
        el.getAttribute("data-tooltip"),
      );
      for (const hint of [
        text.availability.allowQueueHint,
        text.availability.maxWaitMinutesHint,
        text.availability.idleEndMinutesHint,
        text.availability.maxWaitingTalkersHint,
        text.availability.orgMaxConcurrentHint,
        text.languages.hint,
        text.talkerText.emergencyResourcesHint,
        text.safety.escalationChecklistHint,
        text.safety.riskHighConfidenceHint,
        text.safety.supervisorAlertsHint,
        text.safety.listenerSupportContactHint,
        text.copilot.riskClassifierHint,
        text.retention.daysHint,
        text.summaryFields.hint,
      ]) {
        expect(tips).toContain(hint);
      }
    });

    it("saves optional text as null when it is left blank", async () => {
      renderSettings();

      setValue(text.talkerText.ageNotice, "  ");
      setValue(text.safety.listenerSupportContact, "");
      setValue(text.availability.maxWaitMinutes, "31");
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      const { settings } = mockUpdate.mock.calls[0][0];
      expect(settings.ageNotice).toBeNull();
      expect(settings.listenerSupportContact).toBeNull();
    });
  });

  describe("keeping the form in step with the server", () => {
    it("takes a new server value when the form is untouched", () => {
      const { rerender } = renderSettings();
      expect(screen.getByLabelText(text.availability.maxWaitMinutes)).toHaveValue(30);

      loaded(buildDto({ settings: buildSettings({ maxWaitMinutes: 60 }) }));
      rerender(<TextHelplineSettings tenantId="acme" />);

      expect(screen.getByLabelText(text.availability.maxWaitMinutes)).toHaveValue(60);
      expect(saveButton()).toBeDisabled();
    });

    it("leaves an edit in progress alone when the server value changes", () => {
      const { rerender } = renderSettings();
      setValue(text.availability.maxWaitMinutes, "45");

      loaded(buildDto({ settings: buildSettings({ idleEndMinutes: 20 }) }));
      rerender(<TextHelplineSettings tenantId="acme" />);

      expect(screen.getByLabelText(text.availability.maxWaitMinutes)).toHaveValue(45);
      expect(screen.getByLabelText(text.availability.idleEndMinutes)).toHaveValue(15);
    });

    it("follows a server-side change to the enable switch", () => {
      const { rerender } = renderSettings();
      expect(screen.getByText(en.common.disabled)).toBeInTheDocument();

      loaded(buildDto({ enabled: true }));
      rerender(<TextHelplineSettings tenantId="acme" />);

      expect(within(document.body).getByText(en.common.enabled)).toBeInTheDocument();
    });
  });
});
