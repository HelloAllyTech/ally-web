import React from "react";

import {
  FilterableMultiSelect,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
} from "@ally-ui-mono/ui-shared";
import { EntityField } from "@components";
import { en } from "@constants";
import { Tenant } from "@types";

interface CorpusAudienceFieldProps {
  isGlobal: boolean;
  tenantIds: string[];
  tenants: Tenant[];
  disabled?: boolean;
  onChange: (next: { isGlobal: boolean; tenantIds: string[] }) => void;
}

interface Option {
  id: string;
  label: string;
}

/**
 * Who a corpus document is available to: all organisations, or a chosen few.
 *
 * A RADIO PAIR rather than a single "all organisations" checkbox above a list. The two states
 * differ in what the list even means — while `isGlobal` is true the selected organisations are not
 * consulted at all — and a checkbox above a live list invites the reading that ticking it ADDS
 * everyone to a selection you can then trim, which is not what happens.
 *
 * The empty selection is warned about, not blocked. "Available to nobody" is a legitimate way to
 * take a document out of circulation without archiving it — but it is also what a half-finished
 * edit looks like, and the two are indistinguishable from the table, so the panel says it out loud
 * at the moment the admin can still change their mind.
 */
export const CorpusAudienceField: React.FC<CorpusAudienceFieldProps> = ({
  isGlobal,
  tenantIds,
  tenants,
  disabled,
  onChange,
}) => {
  const options: Option[] = tenants.map(tenant => ({
    id: tenant.id,
    label: tenant.name,
  }));
  const selected = options.filter(option => tenantIds.includes(option.id));

  return (
    <>
      <EntityField
        label={en.whatsappBot.corpus.audienceLabel}
        help={en.whatsappBot.corpus.audienceHelp}
      >
        <RadioButtonGroup
          name="kb-audience"
          valueSelected={isGlobal ? "all" : "specific"}
          orientation="vertical"
          legendText=""
          onChange={(value: unknown) => onChange({ isGlobal: value === "all", tenantIds })}
          disabled={disabled}
        >
          <RadioButton
            labelText={en.whatsappBot.corpus.audienceAll}
            value="all"
            id="kb-audience-all"
          />
          <RadioButton
            labelText={en.whatsappBot.corpus.audienceSpecific}
            value="specific"
            id="kb-audience-specific"
          />
        </RadioButtonGroup>
      </EntityField>

      {!isGlobal && (
        <EntityField label={en.whatsappBot.corpus.audiencePickLabel}>
          <FilterableMultiSelect
            id="kb-audience-tenants"
            titleText=""
            placeholder={en.whatsappBot.corpus.audiencePickPlaceholder}
            items={options}
            itemToString={(item: Option | null) => item?.label ?? ""}
            initialSelectedItems={selected}
            selectedItems={selected}
            disabled={disabled}
            onChange={({ selectedItems }: { selectedItems: Option[] | null }) =>
              onChange({
                isGlobal: false,
                tenantIds: (selectedItems ?? []).map(item => item.id),
              })
            }
          />

          {/* Warned, not blocked — see the docblock. */}
          {tenantIds.length === 0 && (
            <div className="pt-2">
              <InlineNotification
                kind="warning"
                title={en.whatsappBot.corpus.audienceNoneWarning}
                lowContrast
                hideCloseButton
              />
            </div>
          )}
        </EntityField>
      )}
    </>
  );
};

/**
 * The table cell: "All", up to two organisation names, or "Nobody".
 *
 * NAMES rather than a count, because the question this column answers is "should this customer be
 * able to see this", and a count answers it for nobody. Two, because a document shared with a
 * dozen organisations would otherwise wrap the row — the rest are reachable in one click.
 */
export const audienceSummary = (
  isGlobal: boolean,
  tenantIds: string[],
  tenantNames: Map<string, string>,
  maxNames = 2,
): { label: string; tone: "all" | "some" | "none" } => {
  if (isGlobal) {
    return { label: en.whatsappBot.corpus.audienceAllBadge, tone: "all" };
  }
  if (!tenantIds.length) {
    return { label: en.whatsappBot.corpus.audienceNoneCell, tone: "none" };
  }

  const named = tenantIds.map(id => tenantNames.get(id) ?? id);
  const shown = named.slice(0, maxNames).join(", ");
  const remaining = named.length - maxNames;

  return {
    label:
      remaining > 0
        ? `${shown}, ${en.whatsappBot.corpus.audienceMore.replace("{count}", String(remaining))}`
        : shown,
    tone: "some",
  };
};
