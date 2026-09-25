import React, { useState } from "react";

import { toast } from "sonner";

import { InlineNotification, TextInput } from "@ally-ui-mono/ui-shared";
import {
  useCheckWaProviderConnectionMutation,
  useRegisterWaPhoneNumberMutation,
  useSubscribeWaProviderAppMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { WaConnectionCheck, WaProviderHealth } from "@types";

const t = en.whatsappBot.settings;

/** Where Meta must deliver webhooks — the same origin every admin API call already goes to. */
const WEBHOOK_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/webhook/whatsapp`;

/** ally-be puts the human-readable reason (Meta's own, for these endpoints) in `data.message`. */
const errorMessage = (error: unknown, fallback: string): string => {
  const message = (error as { data?: { message?: unknown } } | undefined)?.data?.message;
  if (typeof message === "string" && message) return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return fallback;
};

/**
 * The Connection section of the bot settings: what is configured, whether Meta actually accepts
 * it, and whether the bot is ready to be switched on.
 *
 * Three layers, because each can be green while the next is red. Every environment value can be
 * present while the token has expired overnight; the connection can be perfect while no number is
 * mapped to an organisation, so every worker is refused. Showing only the first layer — which is
 * what this section used to do — made "all green" a claim the bot could not back up.
 *
 * The two Meta actions (register, subscribe) live here because they are the setup steps that
 * otherwise need Graph API Explorer and a pasted access token, and because the webhook subscription
 * is the one whose omission is completely silent: the handshake succeeds and then nothing arrives.
 */
export const ProviderConnectionSection: React.FC<{ health?: WaProviderHealth }> = ({ health }) => {
  const [check, setCheck] = useState<WaConnectionCheck | null>(null);
  const [pin, setPin] = useState("");
  const [runCheck, { isLoading: isChecking }] = useCheckWaProviderConnectionMutation();
  const [register, { isLoading: isRegistering }] = useRegisterWaPhoneNumberMutation();
  const [subscribe, { isLoading: isSubscribing }] = useSubscribeWaProviderAppMutation();

  const pinValid = /^\d{6}$/.test(pin);

  const handleCheck = async () => {
    try {
      setCheck(await runCheck().unwrap());
    } catch (error) {
      toast.error(errorMessage(error, t.checkFailed));
    }
  };

  const handleRegister = async () => {
    if (!pinValid) return;
    try {
      setCheck(await register({ pin }).unwrap());
      setPin("");
      toast.success(t.registered);
    } catch (error) {
      toast.error(errorMessage(error, t.registerFailed));
    }
  };

  const handleSubscribe = async () => {
    try {
      setCheck(await subscribe().unwrap());
      toast.success(t.subscribed);
    } catch (error) {
      toast.error(errorMessage(error, t.subscribeFailed));
    }
  };

  const copyWebhookUrl = async () => {
    // Clipboard access can be refused (insecure origin, permissions policy); say so rather than
    // leave a button that silently did nothing.
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  const phone = check?.phoneNumber;
  // Only CLOUD_API means registered. An absent value (the fallback field set, or an older API
  // version) is "unknown", which must not offer a registration the number may not need.
  const registration =
    phone?.platformType === "CLOUD_API"
      ? t.registrationDone
      : phone?.platformType
        ? t.registrationNeeded
        : t.registrationUnknown;
  const needsRegistration = Boolean(
    check?.ok && phone?.platformType && phone.platformType !== "CLOUD_API",
  );

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-base text-typography-900 font-secondary">{t.providerSection}</h3>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-typography-700">{t.webhookUrlLabel}</span>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 break-all text-xs bg-background-100 border border-border-light rounded px-2 py-1.5">
            {WEBHOOK_URL}
          </code>
          <Button variant={ButtonVariant.SECONDARY} onClick={() => void copyWebhookUrl()}>
            {t.copy}
          </Button>
        </div>
        <span className="text-xs text-typography-500">{t.webhookUrlHelp}</span>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm text-typography-800">{t.configSubheading}</h4>
        <p className="text-xs text-typography-500">{t.providerHelp}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <HealthRow label={t.verifyToken} ok={health?.verifyTokenConfigured} />
          <HealthRow label={t.appSecret} ok={health?.appSecretConfigured} />
          <HealthRow label={t.phoneNumberId} ok={health?.phoneNumberIdConfigured} />
          <HealthRow label={t.accessToken} ok={health?.accessTokenConfigured} />
          <HealthRow label={t.businessAccountId} ok={health?.businessAccountIdConfigured} />
          <HealthRow label={t.inboundQueue} ok={health?.inboundQueueConfigured} />
          <HealthRow label={t.inboundDlq} ok={health?.inboundDlqConfigured} />
          <HealthRow label={t.kbIngestQueue} ok={health?.kbIngestQueueConfigured} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm text-typography-800">{t.checkHeading}</h4>
        <p className="text-xs text-typography-500">{t.checkHelp}</p>
        <div>
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={() => void handleCheck()}
            disabled={isChecking}
          >
            {isChecking ? t.checking : t.checkButton}
          </Button>
        </div>

        {check && (
          <div className="flex flex-col gap-2 pt-1">
            <InlineNotification
              kind={check.ok ? "success" : "error"}
              title={check.ok ? t.checkOk : t.checkNotOk}
              subtitle={check.error}
              lowContrast
              hideCloseButton
            />

            {check.ok && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <InfoRow label={t.numberLabel} value={phone?.displayPhoneNumber} />
                <InfoRow label={t.verifiedNameLabel} value={phone?.verifiedName} />
                <InfoRow label={t.nameStatusLabel} value={phone?.nameStatus} />
                <InfoRow
                  label={t.qualityLabel}
                  value={phone?.qualityRating}
                  bad={phone?.qualityRating === "RED"}
                />
                <InfoRow label={t.numberStatusLabel} value={phone?.status} />
                <InfoRow label={t.registrationLabel} value={registration} bad={needsRegistration} />
              </div>
            )}

            {needsRegistration && (
              <div className="flex flex-col gap-2 border border-border-light rounded-md p-3">
                <span className="text-sm text-typography-800">{t.registerHeading}</span>
                <span className="text-xs text-typography-500">{t.registerHelp}</span>
                <div className="flex items-start gap-2">
                  <div className="w-40">
                    <TextInput
                      id="wa-register-pin"
                      labelText={t.pinLabel}
                      hideLabel
                      placeholder={t.pinLabel}
                      value={pin}
                      inputMode="numeric"
                      maxLength={6}
                      invalid={pin.length > 0 && !pinValid}
                      invalidText={t.pinInvalid}
                      onChange={event => setPin(event.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <Button
                    variant={ButtonVariant.PRIMARY}
                    onClick={() => void handleRegister()}
                    disabled={!pinValid || isRegistering}
                  >
                    {isRegistering ? t.registering : t.registerButton}
                  </Button>
                </div>
              </div>
            )}

            <SubscriptionRow
              check={check}
              isSubscribing={isSubscribing}
              onSubscribe={() => void handleSubscribe()}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm text-typography-800">{t.readinessHeading}</h4>
        <p className="text-xs text-typography-500">{t.readinessHelp}</p>
        <div className="flex flex-col gap-1 text-sm">
          <ReadinessRow label={t.readinessHelpline} ok={health?.helplineNumbersSet} />
          <ReadinessRow
            label={t.readinessMappedNumbers}
            ok={health?.mappedNumbers === undefined ? undefined : health.mappedNumbers > 0}
            value={health?.mappedNumbers}
            help={t.readinessMappedHelp}
          />
          <ReadinessRow
            label={t.readinessDocuments}
            ok={health?.indexedDocuments === undefined ? undefined : health.indexedDocuments > 0}
            value={health?.indexedDocuments}
            help={t.readinessDocumentsHelp}
          />
        </div>
      </div>
    </section>
  );
};

const SubscriptionRow: React.FC<{
  check: WaConnectionCheck;
  isSubscribing: boolean;
  onSubscribe: () => void;
}> = ({ check, isSubscribing, onSubscribe }) => {
  const apps = check.subscribedApps;
  // null = not checked; [] = checked and nothing subscribed. Only the second offers the fix.
  const value = check.subscriptionError
    ? check.subscriptionError
    : apps === null || apps === undefined
      ? t.subscriptionUnchecked
      : apps.length === 0
        ? t.subscriptionNone
        : `${t.subscriptionYes}: ${apps.join(", ")}`;
  const canSubscribe = Array.isArray(apps) || Boolean(check.subscriptionError);
  const bad = Boolean(check.subscriptionError) || (Array.isArray(apps) && apps.length === 0);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between gap-4 border-b border-border-light py-1">
        <span className="text-typography-600">{t.subscriptionLabel}</span>
        <span className={`text-right ${bad ? "text-destructive-600" : "text-typography-800"}`}>
          {value}
        </span>
      </div>
      {canSubscribe && bad && (
        <div>
          <Button variant={ButtonVariant.PRIMARY} onClick={onSubscribe} disabled={isSubscribing}>
            {isSubscribing ? t.subscribing : t.subscribeButton}
          </Button>
        </div>
      )}
    </div>
  );
};

const HealthRow: React.FC<{ label: string; ok?: boolean }> = ({ label, ok }) => (
  <div className="flex justify-between border-b border-border-light py-1">
    <span className="text-typography-600">{label}</span>
    {ok === undefined ? (
      <span className="text-typography-400">—</span>
    ) : (
      <span className={ok ? "text-green-700" : "text-destructive-600"}>
        {ok ? t.providerHealthy : t.providerMissing}
      </span>
    )}
  </div>
);

const InfoRow: React.FC<{ label: string; value?: string; bad?: boolean }> = ({
  label,
  value,
  bad,
}) => (
  <div className="flex justify-between gap-4 border-b border-border-light py-1">
    <span className="text-typography-600">{label}</span>
    <span className={`text-right ${bad ? "text-destructive-600" : "text-typography-800"}`}>
      {value || "—"}
    </span>
  </div>
);

const ReadinessRow: React.FC<{ label: string; ok?: boolean; value?: number; help?: string }> = ({
  label,
  ok,
  value,
  help,
}) => (
  <div className="flex flex-col border-b border-border-light py-1">
    <div className="flex justify-between gap-4">
      <span className="text-typography-600">{label}</span>
      {ok === undefined ? (
        <span className="text-typography-400">—</span>
      ) : (
        <span className={ok ? "text-green-700" : "text-destructive-600"}>
          {value !== undefined ? value : ok ? t.readinessYes : t.readinessNo}
        </span>
      )}
    </div>
    {ok === false && help && <span className="text-xs text-typography-500">{help}</span>}
  </div>
);
