import React, { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { CarbonDropdown, InlineNotification, TextInput } from "@ally-ui-mono/ui-shared";
import {
  useCreateWaPhoneMappingMutation,
  useGetTenantsQuery,
  useUpdateWaPhoneMappingMutation,
} from "@api";
import { EntityField, EntitySidePanel } from "@components";
import { en } from "@constants";
import { WaPhoneMapping } from "@types";

interface PhoneMappingPanelProps {
  isOpen: boolean;
  /** Null = add. */
  mapping: WaPhoneMapping | null;
  onClose: () => void;
}

interface TenantOption {
  id: string;
  label: string;
}

/** One request covers every organisation; see the corpus panel for why this is not paged. */
const TENANT_PAGE_SIZE = 200;

/**
 * Add or move one number.
 *
 * The number itself is NOT editable after creation. A mapping is identified by its number, so
 * changing it is really "remove that mapping and add a different one" — and editing it in place
 * would let an admin retype a digit and silently move access from one worker to another while
 * the label still names the first.
 */
export const PhoneMappingPanel: React.FC<PhoneMappingPanelProps> = ({
  isOpen,
  mapping,
  onClose,
}) => {
  const isEdit = Boolean(mapping);

  const [phone, setPhone] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [label, setLabel] = useState("");

  const { data: tenantData } = useGetTenantsQuery({ limit: TENANT_PAGE_SIZE }, { skip: !isOpen });
  const tenantOptions: TenantOption[] = (tenantData?.data ?? []).map(tenant => ({
    id: tenant.id,
    label: tenant.name,
  }));

  const [createMapping, { isLoading: isCreating }] = useCreateWaPhoneMappingMutation();
  const [updateMapping, { isLoading: isUpdating }] = useUpdateWaPhoneMappingMutation();

  useEffect(() => {
    if (!isOpen) return;
    setPhone(mapping?.phoneE164 ?? "");
    setTenantId(mapping?.tenantId ?? "");
    setLabel(mapping?.label ?? "");
  }, [isOpen, mapping]);

  const validation = useMemo(() => {
    if (!phone.trim()) return en.whatsappBot.phoneMappings.validationPhone;
    if (!tenantId) return en.whatsappBot.phoneMappings.validationOrganisation;
    return null;
  }, [phone, tenantId]);

  const dirty = useMemo(() => {
    if (!isEdit) return Boolean(phone.trim() || tenantId || label.trim());
    return tenantId !== (mapping?.tenantId ?? "") || label !== (mapping?.label ?? "");
  }, [isEdit, phone, tenantId, label, mapping]);

  const isSaving = isCreating || isUpdating;

  const handleSave = async () => {
    if (validation) return;
    try {
      if (isEdit && mapping) {
        await updateMapping({ id: mapping.id, tenantId, label: label.trim() }).unwrap();
        toast.success(en.whatsappBot.phoneMappings.updated);
      } else {
        await createMapping({
          phone: phone.trim(),
          tenantId,
          ...(label.trim() ? { label: label.trim() } : {}),
        }).unwrap();
        toast.success(en.whatsappBot.phoneMappings.created);
      }
      onClose();
    } catch {
      toast.error(en.whatsappBot.phoneMappings.saveFailed);
    }
  };

  return (
    <EntitySidePanel
      isOpen={isOpen}
      title={isEdit ? en.whatsappBot.phoneMappings.edit : en.whatsappBot.phoneMappings.add}
      dirty={dirty}
      saveDisabled={Boolean(validation) || isSaving}
      saveDisabledReason={validation ?? undefined}
      onClose={onClose}
      onSave={() => void handleSave()}
    >
      <EntityField
        label={en.whatsappBot.phoneMappings.phoneLabel}
        required
        help={en.whatsappBot.phoneMappings.phoneHelp}
      >
        <TextInput
          id="wa-mapping-phone"
          labelText=""
          hideLabel
          value={phone}
          placeholder={en.whatsappBot.phoneMappings.phonePlaceholder}
          disabled={isEdit}
          onChange={event => setPhone(event.target.value)}
        />
      </EntityField>

      <EntityField
        label={en.whatsappBot.phoneMappings.organisationLabel}
        required
        help={en.whatsappBot.phoneMappings.organisationHelp}
      >
        <CarbonDropdown
          id="wa-mapping-tenant"
          titleText=""
          hideLabel
          label={en.whatsappBot.phoneMappings.organisationLabel}
          items={tenantOptions}
          itemToString={(item: TenantOption | null) => item?.label ?? ""}
          selectedItem={tenantOptions.find(option => option.id === tenantId) ?? null}
          onChange={({ selectedItem }: { selectedItem?: TenantOption | null }) =>
            setTenantId(selectedItem?.id ?? "")
          }
        />
      </EntityField>

      {/* Shown, not resolved. The mapping wins on purpose — an admin typed it — but an admin
          about to save one that disagrees with a profile should know before, not find out from
          a support ticket. */}
      {mapping?.conflictingTenantName && (
        <InlineNotification
          kind="info"
          title={en.whatsappBot.phoneMappings.conflictWarning(mapping.conflictingTenantName)}
          lowContrast
          hideCloseButton
        />
      )}

      <EntityField
        label={en.whatsappBot.phoneMappings.whoLabel}
        help={en.whatsappBot.phoneMappings.whoHelp}
      >
        <TextInput
          id="wa-mapping-label"
          labelText=""
          hideLabel
          value={label}
          placeholder={en.whatsappBot.phoneMappings.whoPlaceholder}
          onChange={event => setLabel(event.target.value)}
        />
      </EntityField>
    </EntitySidePanel>
  );
};
