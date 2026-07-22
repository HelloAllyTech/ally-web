import { FC, useMemo, useState } from "react";

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
import { ActionConfirmationPopup, Button, FormLabel, SegmentedToggle, TagList } from "@components";
import { ButtonVariant } from "@components/types";
import {
  AgentTestCase,
  AgentTestCaseRubric,
  AgentTestCaseType,
  CreateAgentTestCaseRequest,
} from "@types";

import { RubricsEditor } from "./RubricsEditor";
import { TagsInput } from "./TagsInput";

interface TestCaseFormState {
  type: AgentTestCaseType;
  title: string;
  tags: string[];
  condition: string;
  test: string;
  rubrics: AgentTestCaseRubric[];
}

const EMPTY_FORM: TestCaseFormState = {
  type: "condition",
  title: "",
  tags: [],
  condition: "",
  test: "",
  rubrics: [],
};

const TYPE_OPTIONS: { label: string; value: AgentTestCaseType }[] = [
  { label: "Condition Test", value: "condition" },
  { label: "Full Session Test", value: "full_session" },
];

const typeLabel = (type: AgentTestCaseType): string =>
  type === "full_session" ? "Full Session Test" : "Condition Test";

export const AgentTestCases: FC = () => {
  const { data, isLoading } = useGetAgentTestCasesQuery();
  const [createTestCase, { isLoading: isCreating }] = useCreateAgentTestCaseMutation();
  const [updateTestCase, { isLoading: isUpdating }] = useUpdateAgentTestCaseMutation();
  const [deleteTestCase] = useDeleteAgentTestCaseMutation();

  // Side-panel state: undefined = closed, null = create, otherwise edit.
  const [editing, setEditing] = useState<AgentTestCase | null | undefined>(undefined);
  const [form, setForm] = useState<TestCaseFormState>(EMPTY_FORM);
  const [testCasePendingDelete, setTestCasePendingDelete] = useState<AgentTestCase | null>(null);

  const testCases = data?.data ?? [];
  const isPanelOpen = editing !== undefined;
  const isSaving = isCreating || isUpdating;
  const canSave = form.title.trim().length > 0;

  // Suggest tags the admin has already used on other test cases.
  const tagSuggestions = useMemo(
    () => Array.from(new Set(testCases.flatMap(tc => tc.tags ?? []))).sort(),
    [testCases],
  );

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
  };

  const openEdit = (testCase: AgentTestCase) => {
    setForm({
      type: testCase.type,
      title: testCase.title,
      tags: testCase.tags ?? [],
      condition: testCase.condition ?? "",
      test: testCase.test ?? "",
      rubrics: testCase.rubrics ?? [],
    });
    setEditing(testCase);
  };

  const closePanel = () => setEditing(undefined);

  const handleSave = async () => {
    if (!canSave) return;

    const base = {
      title: form.title.trim(),
      type: form.type,
      tags: form.tags,
    };
    const payload: CreateAgentTestCaseRequest =
      form.type === "condition"
        ? {
            ...base,
            condition: form.condition.trim() || undefined,
            test: form.test.trim() || undefined,
          }
        : {
            ...base,
            rubrics: form.rubrics
              .map(row => ({
                criteria: row.criteria.trim(),
                scoringInstructions: row.scoringInstructions.trim(),
              }))
              .filter(row => row.criteria || row.scoringInstructions),
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

  const renderDetails = (testCase: AgentTestCase) => {
    if (testCase.type === "full_session") {
      const rubrics = testCase.rubrics ?? [];
      if (rubrics.length === 0) return <span className="text-typography-400">—</span>;
      return (
        <div className="flex flex-col gap-1">
          <span className="text-typography-700">
            {rubrics.length} rubric{rubrics.length === 1 ? "" : "s"}
          </span>
          <span className="text-typography-500 text-xs">
            {rubrics
              .map(r => r.criteria)
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1">
        <span className="whitespace-pre-wrap text-typography-700">
          <span className="text-typography-500">Condition: </span>
          {testCase.condition || "—"}
        </span>
        <span className="whitespace-pre-wrap text-typography-700">
          <span className="text-typography-500">Pass: </span>
          {testCase.test || "—"}
        </span>
      </div>
    );
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
                <TableHeader className="py-3 pr-4 font-medium w-1/5">Title</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium w-[140px]">Type</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium w-1/6">Tags</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Details</TableHeader>
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
                  <TableCell className="py-3 pr-4">
                    <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-500 px-2 py-0.5 text-xs whitespace-nowrap">
                      {typeLabel(testCase.type)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    <TagList tags={testCase.tags} />
                  </TableCell>
                  <TableCell className="py-3 pr-4">{renderDetails(testCase)}</TableCell>
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
              <FormLabel>Test case type</FormLabel>
              <SegmentedToggle<AgentTestCaseType>
                value={form.type}
                options={TYPE_OPTIONS}
                onChange={type => setForm(prev => ({ ...prev, type }))}
                label="Test case type"
              />
            </div>

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

            <TagsInput
              tags={form.tags}
              onChange={tags => setForm(prev => ({ ...prev, tags }))}
              suggestions={tagSuggestions}
              label="Tags"
            />

            {form.type === "condition" ? (
              <>
                <div className="flex flex-col gap-2">
                  <FormLabel>Condition to simulate</FormLabel>
                  <AutoExpandableTextarea
                    value={form.condition}
                    onChange={value => setForm(prev => ({ ...prev, condition: value }))}
                    placeholder="The condition to simulate during the session."
                    minHeight={96}
                    maxLines={12}
                    className="w-full rounded border border-border-light px-3 py-2 bg-white text-base"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FormLabel>Test pass description</FormLabel>
                  <AutoExpandableTextarea
                    value={form.test}
                    onChange={value => setForm(prev => ({ ...prev, test: value }))}
                    placeholder="What must the agent do to pass this condition?"
                    minHeight={96}
                    maxLines={12}
                    className="w-full rounded border border-border-light px-3 py-2 bg-white text-base"
                  />
                </div>
              </>
            ) : (
              <RubricsEditor
                rubrics={form.rubrics}
                onChange={rubrics => setForm(prev => ({ ...prev, rubrics }))}
              />
            )}

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
