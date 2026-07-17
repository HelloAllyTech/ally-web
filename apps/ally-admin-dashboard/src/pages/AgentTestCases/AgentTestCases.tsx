import { FC, useState } from "react";

import { toast } from "sonner";

import {
  AutoExpandableTextarea,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@ally-ui-mono/ui-shared";
import {
  useCreateAgentTestCaseMutation,
  useDeleteAgentTestCaseMutation,
  useGetAgentTestCasesQuery,
  useUpdateAgentTestCaseMutation,
} from "@api";
import { ActionConfirmationPopup, Button, FormLabel } from "@components";
import { ButtonVariant } from "@components/types";
import { AgentTestCase } from "@types";

interface TestCaseFormState {
  title: string;
  category: string;
  description: string;
  condition: string;
  test: string;
}

const EMPTY_FORM: TestCaseFormState = {
  title: "",
  category: "",
  description: "",
  condition: "",
  test: "",
};

export const AgentTestCases: FC = () => {
  const { data, isLoading } = useGetAgentTestCasesQuery();
  const [createTestCase, { isLoading: isCreating }] = useCreateAgentTestCaseMutation();
  const [updateTestCase, { isLoading: isUpdating }] = useUpdateAgentTestCaseMutation();
  const [deleteTestCase] = useDeleteAgentTestCaseMutation();

  // Side-panel state: null = closed, otherwise create (no id) or edit.
  const [editing, setEditing] = useState<AgentTestCase | null | undefined>(undefined);
  const [form, setForm] = useState<TestCaseFormState>(EMPTY_FORM);
  const [testCasePendingDelete, setTestCasePendingDelete] = useState<AgentTestCase | null>(null);

  const testCases = data?.data ?? [];
  const isPanelOpen = editing !== undefined;
  const isSaving = isCreating || isUpdating;
  const canSave = form.title.trim().length > 0 && form.category.trim().length > 0;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
  };

  const openEdit = (testCase: AgentTestCase) => {
    setForm({
      title: testCase.title,
      category: testCase.category,
      description: testCase.description ?? "",
      condition: testCase.condition ?? "",
      test: testCase.test ?? "",
    });
    setEditing(testCase);
  };

  const closePanel = () => setEditing(undefined);

  const handleSave = async () => {
    if (!canSave) return;
    const payload = {
      title: form.title.trim(),
      category: form.category.trim(),
      description: form.description.trim() || undefined,
      condition: form.condition.trim() || undefined,
      test: form.test.trim() || undefined,
    };
    try {
      if (editing) {
        await updateTestCase({ id: editing.id, data: payload }).unwrap();
        toast.success("Agent test case updated");
      } else {
        await createTestCase(payload).unwrap();
        toast.success("Agent test case created");
      }
      closePanel();
    } catch {
      toast.error("Failed to save agent test case");
    }
  };

  const handleDelete = async () => {
    if (!testCasePendingDelete) return;
    try {
      await deleteTestCase(testCasePendingDelete.id).unwrap();
      toast.success("Agent test case deleted");
    } catch {
      toast.error("Failed to delete agent test case");
    } finally {
      setTestCasePendingDelete(null);
    }
  };

  return (
    <div className="h-full font-primary flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <h1 className="text-2xl text-typography-900 font-secondary">Agent Test Cases</h1>
        <Button variant={ButtonVariant.PRIMARY} onClick={openCreate} className="h-[40px] px-5">
          Create test case
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar mt-6">
        {isLoading ? (
          <p className="text-typography-700">Loading…</p>
        ) : testCases.length === 0 ? (
          <p className="text-typography-700">
            No agent test cases yet. Click “Create test case” to add one.
          </p>
        ) : (
          <Table className="w-full text-left border-collapse">
            <TableHead>
              <TableRow className="border-b border-border-light text-sm text-typography-700">
                <TableHeader className="py-3 pr-4 font-medium w-1/6">Title</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium w-1/12">Category</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Condition</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Test</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Description</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium w-[120px]">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {testCases.map(testCase => (
                <TableRow
                  key={testCase.id}
                  className="border-b border-border-light text-sm text-typography-900 align-top"
                >
                  <TableCell className="py-3 pr-4">{testCase.title}</TableCell>
                  <TableCell className="py-3 pr-4">{testCase.category}</TableCell>
                  <TableCell className="py-3 pr-4 text-typography-700 whitespace-pre-wrap">
                    {testCase.condition || "—"}
                  </TableCell>
                  <TableCell className="py-3 pr-4 text-typography-700 whitespace-pre-wrap">
                    {testCase.test || "—"}
                  </TableCell>
                  <TableCell className="py-3 pr-4 text-typography-700 whitespace-pre-wrap">
                    {testCase.description || "—"}
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    <div className="flex gap-3">
                      <button
                        className="text-primary-500 hover:underline"
                        onClick={() => openEdit(testCase)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-destructive-500 hover:underline"
                        onClick={() => setTestCasePendingDelete(testCase)}
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Slide-in create/edit panel. */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closePanel} />
          <div className="relative z-50 h-full w-full max-w-[480px] bg-white shadow-xl flex flex-col p-6 gap-5 overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-secondary text-typography-900">
              {editing ? "Edit agent test case" : "Create agent test case"}
            </h2>

            <div className="flex flex-col gap-2">
              <FormLabel isMandatory>Title</FormLabel>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Build rapport with the user"
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base focus-within:ring-1 focus-within:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <FormLabel isMandatory>Category</FormLabel>
              <input
                type="text"
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Relationship"
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base focus-within:ring-1 focus-within:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <FormLabel>Condition</FormLabel>
              <AutoExpandableTextarea
                value={form.condition}
                onChange={value => setForm(prev => ({ ...prev, condition: value }))}
                placeholder="When does this test case apply? (the precondition to evaluate)"
                minHeight={96}
                maxLines={12}
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base"
              />
            </div>

            <div className="flex flex-col gap-2">
              <FormLabel>Test</FormLabel>
              <AutoExpandableTextarea
                value={form.test}
                onChange={value => setForm(prev => ({ ...prev, test: value }))}
                placeholder="What should the agent do to pass? (the assertion)"
                minHeight={96}
                maxLines={12}
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base"
              />
            </div>

            <div className="flex flex-col gap-2">
              <FormLabel>Description</FormLabel>
              <AutoExpandableTextarea
                value={form.description}
                onChange={value => setForm(prev => ({ ...prev, description: value }))}
                placeholder="What does this test case mean and when should it apply?"
                minHeight={96}
                maxLines={12}
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base"
              />
            </div>

            <div className="flex justify-end gap-3 mt-auto">
              <Button variant={ButtonVariant.TEXT} onClick={closePanel} className="h-[40px] px-5">
                Cancel
              </Button>
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handleSave}
                disabled={!canSave || isSaving}
                className="h-[40px] px-5"
              >
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ActionConfirmationPopup
        isOpen={Boolean(testCasePendingDelete)}
        onClose={() => setTestCasePendingDelete(null)}
        title="Delete"
        titleItalic="agent test case"
        description={`Are you sure you want to delete **${testCasePendingDelete?.title ?? ""}**? This cannot be undone.`}
        primaryButton={{ label: "Delete", onClick: handleDelete }}
        secondaryButton={{ label: "Cancel", onClick: () => setTestCasePendingDelete(null) }}
      />
    </div>
  );
};
