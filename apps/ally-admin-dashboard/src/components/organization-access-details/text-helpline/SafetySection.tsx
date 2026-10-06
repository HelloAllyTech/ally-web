import { FC } from "react";

import { en } from "@src/constants";

import { ChecklistEditor } from "./ChecklistEditor";
import { CheckboxField, HelpTip, NumberField, Section, TextField } from "./formControls";
import { RISK_CONFIDENCE_LIMITS } from "./helpers";
import { SectionProps } from "./sectionProps";

export const SafetySection: FC<SectionProps> = ({ form, errors, onChange }) => {
  const text = en.textHelpline.safety;
  const channels = form.supervisorAlertChannels;
  const setChannels = (patch: Partial<typeof channels>) =>
    onChange({ supervisorAlertChannels: { ...channels, ...patch } });

  return (
    <Section title={text.title}>
      <ChecklistEditor
        steps={form.escalationChecklist}
        errors={errors}
        onChange={escalationChecklist => onChange({ escalationChecklist })}
      />

      <NumberField
        label={text.riskHighConfidence}
        tooltip={text.riskHighConfidenceHint}
        value={form.riskHighConfidence}
        {...RISK_CONFIDENCE_LIMITS}
        error={errors.riskHighConfidence}
        onChange={riskHighConfidence => onChange({ riskHighConfidence })}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-typography-900">
          {text.supervisorAlerts}
          <HelpTip label={text.supervisorAlertsHint} />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <CheckboxField
            label={text.alertInApp}
            checked={channels.inApp}
            onChange={inApp => setChannels({ inApp })}
          />
          <CheckboxField
            label={text.alertPush}
            checked={channels.push}
            onChange={push => setChannels({ push })}
          />
        </div>
        <TextField
          label={text.slackWebhookUrl}
          value={channels.slackWebhookUrl ?? ""}
          placeholder={text.slackWebhookUrlPlaceholder}
          error={errors.slackWebhookUrl}
          onChange={slackWebhookUrl => setChannels({ slackWebhookUrl })}
        />
      </div>

      <TextField
        label={text.listenerSupportContact}
        tooltip={text.listenerSupportContactHint}
        value={form.listenerSupportContact ?? ""}
        onChange={listenerSupportContact => onChange({ listenerSupportContact })}
      />
    </Section>
  );
};
