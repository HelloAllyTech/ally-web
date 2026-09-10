import React, { useMemo, useRef, useState } from "react";

import {
  CarbonDropdown,
  CarbonToggle,
  AutoExpandableTextarea,
  InlineNotification,
} from "@ally-ui-mono/ui-shared";
import { useBulkCreateWaPhoneMappingsMutation, useGetTenantsQuery } from "@api";
import { Button, EntityField, EntitySidePanel } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { BulkWaPhoneMappingsResponse, WaPhoneMappingOutcome } from "@types";

import { parsePhoneMappingRows } from "./parsePhoneMappingRows";

interface PhoneMappingBulkPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TenantOption {
  id: string;
  label: string;
}

const TENANT_PAGE_SIZE = 200;

/** Outcomes worth an admin's attention. Created and moved rows need no line-by-line reading. */
const NEEDS_ATTENTION: WaPhoneMappingOutcome[] = ["conflict", "invalid", "duplicate"];

/**
 * Upload many numbers at once.
 *
 * A FILE FILLS THE TEXTAREA rather than posting straight off disk. An admin pasting a customer's
 * spreadsheet cannot see what a file picker swallowed, and this list decides who the bot will
 * talk to — so the parsed content is put in front of them, editable, before anything is sent.
 *
 * Problems are reported in two passes for two different reasons. Lines this panel cannot read at
 * all (no number, an organisation name that does not exist) are shown BEFORE the upload, because
 * only the browser knows which of 200 lines said "Acme Helth". Everything else — a number already
 * mapped elsewhere, a duplicate, too few digits — comes back from the server per row, because
 * only the server knows what is already in the table.
 */
export const PhoneMappingBulkPanel: React.FC<PhoneMappingBulkPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [text, setText] = useState("");
  const [defaultTenantId, setDefaultTenantId] = useState("");
  const [overwriteConflicts, setOverwriteConflicts] = useState(false);
  const [result, setResult] = useState<BulkWaPhoneMappingsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tenantData } = useGetTenantsQuery({ limit: TENANT_PAGE_SIZE }, { skip: !isOpen });
  const tenants = tenantData?.data ?? [];
  const tenantOptions: TenantOption[] = tenants.map(tenant => ({
    id: tenant.id,
    label: tenant.name,
  }));

  // Names, lower-cased, so a spreadsheet's "Acme Health" column resolves without anyone pasting
  // uuids into it.
  const tenantIdsByName = useMemo(
    () => new Map(tenants.map(tenant => [tenant.name.toLowerCase(), tenant.id])),
    [tenants],
  );

  const [bulkCreate, { isLoading }] = useBulkCreateWaPhoneMappingsMutation();

  const parsed = useMemo(
    () => parsePhoneMappingRows(text, tenantIdsByName),
    [text, tenantIdsByName],
  );

  const rowsMissingOrganisation = parsed.rows.filter(row => !row.tenantId).length;
  const needsDefaultOrganisation = rowsMissingOrganisation > 0 && !defaultTenantId;
  const canUpload = parsed.rows.length > 0 && !needsDefaultOrganisation && !isLoading;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const handleUpload = async (withOverwrite = overwriteConflicts) => {
    setFailed(false);
    try {
      const response = await bulkCreate({
        rows: parsed.rows.map(({ line, ...row }) => {
          void line;
          return row;
        }),
        ...(defaultTenantId ? { defaultTenantId } : {}),
        ...(withOverwrite ? { overwriteConflicts: true } : {}),
      }).unwrap();
      setResult(response);
    } catch {
      setFailed(true);
    }
  };

  const handleClose = () => {
    setText("");
    setDefaultTenantId("");
    setOverwriteConflicts(false);
    setResult(null);
    setFailed(false);
    onClose();
  };

  const attention = (result?.results ?? []).filter(row => NEEDS_ATTENTION.includes(row.outcome));

  return (
    <EntitySidePanel
      isOpen={isOpen}
      title={en.whatsappBot.phoneMappings.bulkHeading}
      dirty={false}
      hideSave
      onClose={handleClose}
    >
      <p className="text-sm text-typography-600">{en.whatsappBot.phoneMappings.bulkSubtitle}</p>

      {/* The result REPLACES the form rather than sitting under it. A finished upload is a
          different task — reading what happened — and leaving the textarea live invites a second
          accidental upload of the same list. */}
      {result ? (
        <div className="flex flex-col gap-4">
          <InlineNotification
            kind={attention.length ? "warning" : "success"}
            title={en.whatsappBot.phoneMappings.bulkSummary}
            subtitle={[
              `${result.created} ${en.whatsappBot.phoneMappings.bulkOutcome.created.toLowerCase()}`,
              `${result.updated} ${en.whatsappBot.phoneMappings.bulkOutcome.updated.toLowerCase()}`,
              `${result.unchanged} ${en.whatsappBot.phoneMappings.bulkOutcome.unchanged.toLowerCase()}`,
              `${result.conflicts} ${en.whatsappBot.phoneMappings.bulkOutcome.conflict.toLowerCase()}`,
              `${result.invalid + result.duplicates} ${en.whatsappBot.phoneMappings.bulkOutcome.invalid.toLowerCase()}`,
            ].join(" · ")}
            lowContrast
            hideCloseButton
          />

          {attention.length === 0 ? (
            <p className="text-sm text-typography-600">
              {en.whatsappBot.phoneMappings.bulkAllGood}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-typography-900">
                {en.whatsappBot.phoneMappings.bulkResultsHeading}
              </p>
              <div className="max-h-64 overflow-y-auto border border-border-light rounded-md">
                <table className="w-full text-sm">
                  <tbody>
                    {attention.map(row => (
                      <tr key={`${row.line}-${row.phone}`} className="border-b border-border-light">
                        <td className="px-3 py-2 text-typography-500 tabular-nums w-12">
                          {row.line}
                        </td>
                        <td className="px-3 py-2 font-mono">{row.phone}</td>
                        <td className="px-3 py-2 text-typography-600">
                          {row.reason ?? en.whatsappBot.phoneMappings.bulkOutcome[row.outcome]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {/* Offered only when there is something for it to do, and it re-sends the SAME rows:
                the conflicts an admin decides to accept are the ones they just read. */}
            {result.conflicts > 0 && (
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={() => void handleUpload(true)}
                disabled={isLoading}
              >
                {en.whatsappBot.phoneMappings.bulkRetryWithOverwrite}
              </Button>
            )}
            <Button variant={ButtonVariant.PRIMARY} onClick={handleClose}>
              {en.whatsappBot.phoneMappings.bulkClose}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <EntityField
            label={en.whatsappBot.phoneMappings.bulkPasteLabel}
            help={en.whatsappBot.phoneMappings.bulkFileHint}
          >
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="hidden"
                onChange={event => handleFile(event.target.files?.[0])}
              />
              <div>
                <Button
                  variant={ButtonVariant.SECONDARY}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {en.whatsappBot.phoneMappings.bulkChooseFile}
                </Button>
              </div>
              <AutoExpandableTextarea
                value={text}
                onChange={setText}
                placeholder={en.whatsappBot.phoneMappings.bulkPastePlaceholder}
                minHeight={140}
              />
              <pre className="text-xs text-typography-400 whitespace-pre-wrap font-mono">
                {en.whatsappBot.phoneMappings.bulkExample}
              </pre>
            </div>
          </EntityField>

          <EntityField label={en.whatsappBot.phoneMappings.bulkDefaultOrganisationLabel}>
            <CarbonDropdown
              id="wa-bulk-tenant"
              titleText=""
              hideLabel
              label={en.whatsappBot.phoneMappings.organisationLabel}
              items={tenantOptions}
              itemToString={(item: TenantOption | null) => item?.label ?? ""}
              selectedItem={tenantOptions.find(option => option.id === defaultTenantId) ?? null}
              invalid={needsDefaultOrganisation}
              invalidText={en.whatsappBot.phoneMappings.validationOrganisation}
              onChange={({ selectedItem }: { selectedItem?: TenantOption | null }) =>
                setDefaultTenantId(selectedItem?.id ?? "")
              }
            />
          </EntityField>

          <EntityField label="">
            <CarbonToggle
              id="wa-bulk-overwrite"
              labelText={en.whatsappBot.phoneMappings.bulkOverwriteLabel}
              size="sm"
              toggled={overwriteConflicts}
              onToggle={(checked: boolean) => setOverwriteConflicts(checked)}
            />
            <p className="text-xs text-typography-500 pt-1">
              {en.whatsappBot.phoneMappings.bulkOverwriteHelp}
            </p>
          </EntityField>

          {/* Before the upload, because only the browser knows which line said "Acme Helth". */}
          {parsed.problems.length > 0 && (
            <div className="flex flex-col gap-2">
              <InlineNotification
                kind="warning"
                title={en.whatsappBot.phoneMappings.bulkParsingProblems(parsed.problems.length)}
                lowContrast
                hideCloseButton
              />
              <ul className="text-xs text-typography-600 flex flex-col gap-1">
                {parsed.problems.map(problem => (
                  <li key={problem.line}>
                    <span className="tabular-nums text-typography-400">{problem.line}</span>{" "}
                    <span className="font-mono">{problem.text}</span> — {problem.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {failed && (
            <InlineNotification
              kind="error"
              title={en.whatsappBot.phoneMappings.bulkFailed}
              lowContrast
              hideCloseButton
            />
          )}

          <div>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={() => void handleUpload()}
              disabled={!canUpload}
            >
              {parsed.rows.length
                ? en.whatsappBot.phoneMappings.bulkSubmit(parsed.rows.length)
                : en.whatsappBot.phoneMappings.bulkNothingToUpload}
            </Button>
          </div>
        </>
      )}
    </EntitySidePanel>
  );
};
