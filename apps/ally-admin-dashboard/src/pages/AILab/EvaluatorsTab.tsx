import React, { useCallback, useState } from "react";

import { Copy, Delete, Refresh } from "@icons";
import { toast } from "sonner";

import {
  useGetLabEvaluatorsQuery,
  useCreateLabEvaluatorMutation,
  useRegenerateEvaluatorPasswordMutation,
  useDeleteLabEvaluatorMutation,
} from "@api";
import { ActionConfirmationPopup, Button, EmptyState, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import { en, ROUTES } from "@constants";
import { LabEvaluator } from "@types";

import { LabSidePanel, LabField } from "./LabSidePanel";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const copyToClipboard = async (text: string) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (!ok) throw new Error("copy command failed");
    }
    toast.success(en.aiLab.evaluators.copied);
  } catch {
    // Don't claim success on failure — the password is shown on screen for
    // the admin to copy manually.
    toast.error(en.aiLab.evaluators.copyFailed);
  }
};

/** Modal showing a freshly generated password — the only time it's visible. */
const PasswordModal: React.FC<{
  email: string;
  password: string;
  onClose: () => void;
}> = ({ email, password, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center">
    {/* No backdrop-click close: the password is shown only once, so require an
        explicit Done to avoid discarding it by an accidental outside click. */}
    <div className="absolute inset-0 bg-black bg-opacity-50" />
    <div className="relative bg-white shadow-xl max-w-md w-full mx-4 px-8 py-6 font-primary">
      <h2 className="text-xl font-medium text-typography-900 mb-1">
        {en.aiLab.evaluators.passwordTitle}
      </h2>
      <p className="text-sm text-typography-600 mb-4">{en.aiLab.evaluators.passwordNote}</p>
      <div className="border border-border-light rounded-md px-4 py-3 bg-background-secondary mb-1">
        <div className="text-xs text-typography-500 mb-1">{email}</div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-lg text-typography-900 break-all">{password}</span>
          <button
            onClick={() => copyToClipboard(password)}
            className="text-typography-600 hover:text-primary-600 shrink-0"
            aria-label={en.aiLab.evaluators.copyPassword}
            title={en.aiLab.evaluators.copyPassword}
          >
            <Copy size={18} />
          </button>
        </div>
      </div>
      <p className="text-xs text-typography-500 mb-4">
        {en.aiLab.evaluators.portalLinkLabel}{" "}
        <span className="font-mono">{`${window.location.origin}${ROUTES.EVALUATE}`}</span>
      </p>
      <div className="flex justify-end">
        <Button variant={ButtonVariant.PRIMARY} onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  </div>
);

export const EvaluatorsTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGetLabEvaluatorsQuery({ search: search || undefined });
  const evaluators = data?.items ?? [];

  const [createEvaluator] = useCreateLabEvaluatorMutation();
  const [regeneratePassword] = useRegenerateEvaluatorPasswordMutation();
  const [deleteEvaluator] = useDeleteLabEvaluatorMutation();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [passwordModal, setPasswordModal] = useState<{ email: string; password: string } | null>(
    null,
  );
  const [regenerateTarget, setRegenerateTarget] = useState<LabEvaluator | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LabEvaluator | null>(null);

  const isValidEmail = EMAIL_PATTERN.test(email.trim());

  const handleCreate = useCallback(async () => {
    if (!isValidEmail) return;
    try {
      const result = await createEvaluator({ email: email.trim() }).unwrap();
      toast.success(en.aiLab.evaluators.created);
      setIsPanelOpen(false);
      setEmail("");
      setPasswordModal({ email: result.evaluator.email, password: result.password });
    } catch (error) {
      const status = (error as { status?: number })?.status;
      toast.error(
        status === 409 ? en.aiLab.evaluators.duplicate : en.aiLab.evaluators.createFailed,
      );
    }
  }, [isValidEmail, email, createEvaluator]);

  const handleRegenerate = useCallback(async () => {
    if (!regenerateTarget) return;
    try {
      const result = await regeneratePassword(regenerateTarget.id).unwrap();
      toast.success(en.aiLab.evaluators.regenerated);
      setPasswordModal({ email: regenerateTarget.email, password: result.password });
    } catch {
      toast.error(en.aiLab.evaluators.regenerateFailed);
    }
    setRegenerateTarget(null);
  }, [regenerateTarget, regeneratePassword]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const response = await deleteEvaluator(deleteTarget.id);
    if ("error" in response && response.error) {
      toast.error(en.aiLab.evaluators.deleteFailed);
    } else {
      toast.success(en.aiLab.evaluators.deleted);
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteEvaluator]);

  return (
    <div className="mt-4">
      <p className="text-typography-600 text-sm mb-4 max-w-3xl">{en.aiLab.evaluators.subtitle}</p>
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder={en.aiLab.evaluators.searchPlaceholder}
        action={{
          label: en.aiLab.evaluators.create,
          onClick: () => {
            setEmail("");
            setIsPanelOpen(true);
          },
          variant: ButtonVariant.PRIMARY,
        }}
      />

      <div className="mt-5">
        {isLoading ? (
          <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
        ) : evaluators.length === 0 ? (
          <EmptyState
            title={en.aiLab.evaluators.empty}
            subtitle={en.aiLab.evaluators.emptySubtitle}
            actionLabel={en.aiLab.evaluators.create}
            onAction={() => {
              setEmail("");
              setIsPanelOpen(true);
            }}
          />
        ) : (
          <div className="border border-border-light rounded-md overflow-hidden">
            <table className="w-full text-left font-primary text-base">
              <thead>
                <tr className="bg-background-secondary text-typography-700 text-sm">
                  <th className="px-4 py-3 font-medium">{en.aiLab.evaluators.columnEmail}</th>
                  <th className="px-4 py-3 font-medium w-[110px]">
                    {en.aiLab.evaluators.columnAssigned}
                  </th>
                  <th className="px-4 py-3 font-medium w-[110px]">
                    {en.aiLab.evaluators.columnSubmitted}
                  </th>
                  <th className="px-4 py-3 font-medium w-[160px]">
                    {en.aiLab.evaluators.columnLastLogin}
                  </th>
                  <th className="px-4 py-3 font-medium w-[130px]">
                    {en.aiLab.evaluators.columnCreated}
                  </th>
                  <th className="px-4 py-3 font-medium text-right w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {evaluators.map(evaluator => (
                  <tr
                    key={evaluator.id}
                    className="border-t border-border-light hover:bg-background-secondary/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-typography-900">{evaluator.email}</td>
                    <td className="px-4 py-3 text-typography-700">
                      {evaluator.assignedCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-typography-700">
                      {evaluator.submittedCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-typography-500 text-sm">
                      {evaluator.lastLoginAt
                        ? new Date(evaluator.lastLoginAt).toLocaleString()
                        : en.aiLab.evaluators.never}
                    </td>
                    <td className="px-4 py-3 text-typography-500 text-sm">
                      {new Date(evaluator.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3 text-typography-600">
                        <button
                          onClick={() => setRegenerateTarget(evaluator)}
                          className="hover:text-primary-600"
                          aria-label={en.aiLab.evaluators.regenerate}
                          title={en.aiLab.evaluators.regenerate}
                        >
                          <Refresh size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(evaluator)}
                          className="hover:text-destructive-600"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Delete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LabSidePanel
        isOpen={isPanelOpen}
        title={en.aiLab.evaluators.create}
        dirty={email.trim().length > 0}
        saveDisabled={!isValidEmail}
        saveDisabledReason={en.aiLab.evaluators.validation}
        onClose={() => setIsPanelOpen(false)}
        onSave={handleCreate}
      >
        <LabField label={en.aiLab.evaluators.emailLabel} required>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={en.aiLab.evaluators.emailPlaceholder}
            className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base"
          />
        </LabField>
      </LabSidePanel>

      {passwordModal && (
        <PasswordModal
          email={passwordModal.email}
          password={passwordModal.password}
          onClose={() => setPasswordModal(null)}
        />
      )}

      <ActionConfirmationPopup
        isOpen={!!regenerateTarget}
        onClose={() => setRegenerateTarget(null)}
        title={en.aiLab.evaluators.regenerateTitle}
        description={en.aiLab.evaluators.regenerateDescription}
        primaryButton={{ label: en.aiLab.evaluators.regenerate, onClick: handleRegenerate }}
        secondaryButton={{ label: en.common.cancel, onClick: () => setRegenerateTarget(null) }}
      />

      <ActionConfirmationPopup
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={en.aiLab.evaluators.deleteTitle}
        description={en.aiLab.evaluators.deleteDescription}
        primaryButton={{
          label: en.common.delete,
          onClick: handleDelete,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{ label: en.common.cancel, onClick: () => setDeleteTarget(null) }}
      />
    </div>
  );
};
