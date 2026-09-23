import { FC, useMemo, useState } from "react";

import { toast } from "sonner";

import { Button, Select, SelectItem, TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useAddBugHunterMemoryMutation,
  useGetBugHunterMemoryQuery,
  useRetireBugHunterMemoryMutation,
} from "@api";
import { TooltipIcon } from "@assets";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { AgentAvatar } from "@components/agent-avatar";
import { en } from "@constants";
import { BUG_HUNTER_MEMORY_BODY_MAX, BugHunterMemoryEntry } from "@types";
import { formatDate } from "@utils";

import { SWEEPABLE_REPOS } from "./SweepPanel";

/** The `Select` value that means "no repo filter: platform-wide entries only". */
const ALL_REPOS = "__all__";

export interface NotebookPanelProps {
  /** Whether this reader may add or retire entries, or only read them. */
  canTriage: boolean;
}

/**
 * Bug Hunter's notebook: what it wrote down for its future self, and what
 * admins added by hand.
 *
 * Two halves. The list is the active set for one repo (plus platform-wide
 * entries), in the order the sweep prompt receives them — pinned first, then
 * by evidence — so what an admin reads here is what the agent reads before
 * hunting. The form is the human half of the notebook: a lesson the team
 * already knows, written so the agent starts from it rather than rediscovering
 * it. A person's entry lands active at once; the agent's own wait for the
 * hourly curator and are not listed here until it promotes them.
 *
 * Retiring rather than deleting, because an entry the curator merged others
 * into is provenance for those, and because "we decided this was wrong" is
 * itself worth keeping.
 */
export const NotebookPanel: FC<NotebookPanelProps> = ({ canTriage }) => {
  const [repo, setRepo] = useState<string>(SWEEPABLE_REPOS[0]);
  const { data, isLoading, isError } = useGetBugHunterMemoryQuery(
    repo === ALL_REPOS ? { limit: 100 } : { repo, limit: 100 },
  );
  const [addEntry, { isLoading: isAdding }] = useAddBugHunterMemoryMutation();
  const [retireEntry, { isLoading: isRetiring }] = useRetireBugHunterMemoryMutation();

  const [body, setBody] = useState("");
  const [scope, setScope] = useState<string>(SWEEPABLE_REPOS[0]);
  const [tags, setTags] = useState("");
  const [pinned, setPinned] = useState(false);
  const [retiring, setRetiring] = useState<BugHunterMemoryEntry | null>(null);

  const trimmed = body.trim();
  const tooLong = trimmed.length > BUG_HUNTER_MEMORY_BODY_MAX;

  const items = useMemo(() => data?.items ?? [], [data]);

  const handleAdd = async () => {
    try {
      await addEntry({
        body: trimmed,
        repos: scope === ALL_REPOS ? [] : [scope],
        tags: tags
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean),
        pinned,
      }).unwrap();
      toast.success(en.bugHunter.notebookAdded);
      setBody("");
      setTags("");
      setPinned(false);
    } catch {
      toast.error(en.bugHunter.notebookAddFailed);
    }
  };

  const handleRetire = async () => {
    if (!retiring) return;
    try {
      await retireEntry(retiring.id).unwrap();
      toast.success(en.bugHunter.notebookRetired);
    } catch {
      toast.error(en.bugHunter.notebookRetireFailed);
    } finally {
      setRetiring(null);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-start gap-3">
        <AgentAvatar size="sm" label={en.bugHunter.agentName} />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-typography-900">
            {en.bugHunter.notebookTitle}
          </h2>
          <p className="text-sm text-typography-700 mt-1">{en.bugHunter.notebookIntro}</p>
        </div>
      </div>

      <div className="mt-4 w-[220px]">
        <Select
          id="bug-hunter-notebook-repo"
          labelText={en.bugHunter.notebookRepoLabel}
          value={repo}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRepo(e.target.value)}
        >
          {SWEEPABLE_REPOS.map(name => (
            <SelectItem key={name} value={name} text={name} />
          ))}
          <SelectItem value={ALL_REPOS} text={en.bugHunter.notebookRepoAll} />
        </Select>
      </div>

      <div className="mt-4 border border-border-light rounded">
        {isLoading ? (
          <p className="px-4 py-6 text-sm text-typography-500">{en.bugHunter.notebookLoading}</p>
        ) : isError ? (
          <p className="px-4 py-6 text-sm text-destructive-600">{en.bugHunter.notebookError}</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-typography-500">{en.bugHunter.notebookEmpty}</p>
        ) : (
          <ul>
            {items.map(entry => (
              <li
                key={entry.id}
                className={`px-4 py-3 border-b border-b-border-light last:border-b-0 ${
                  entry.pinned ? "border-l-4 border-l-orange-500" : ""
                }`}
                data-testid="notebook-entry"
              >
                <p className="text-sm text-typography-900">{entry.body}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-typography-600">
                  <span>
                    {entry.createdBy === null
                      ? en.bugHunter.notebookByMe
                      : en.bugHunter.notebookByHuman}
                  </span>
                  <span className="tabular-nums">
                    {en.bugHunter.notebookSeen.replace("{count}", String(entry.sourceCount))}
                  </span>
                  <span>
                    {entry.repos?.length
                      ? entry.repos.join(", ")
                      : en.bugHunter.notebookPlatformWide}
                  </span>
                  {entry.tags.map(tag => (
                    <span key={tag} className="rounded bg-neutral-100 px-1.5 py-0.5">
                      {tag}
                    </span>
                  ))}
                  {entry.pinned && (
                    <span className="font-semibold text-orange-700">
                      {en.bugHunter.notebookPinned}
                    </span>
                  )}
                  <span className="ml-auto whitespace-nowrap tabular-nums">
                    {formatDate(entry.createdAt)}
                  </span>
                  {canTriage && (
                    <Button
                      size="sm"
                      kind="ghost"
                      disabled={isRetiring}
                      onClick={() => setRetiring(entry)}
                    >
                      {en.bugHunter.notebookRetire}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canTriage ? (
        <div className="mt-6 rounded-lg border border-border-light bg-neutral-50 p-4">
          <h3 className="text-sm font-semibold text-typography-900">
            {en.bugHunter.notebookAddTitle}
          </h3>
          <p className="text-xs text-typography-600 mt-1">
            {en.bugHunter.notebookAddHint.replace("{max}", String(BUG_HUNTER_MEMORY_BODY_MAX))}
          </p>

          <div className="mt-3 flex flex-col gap-3">
            <TextArea
              id="bug-hunter-notebook-body"
              labelText={en.bugHunter.notebookAddLabel}
              placeholder={en.bugHunter.notebookAddPlaceholder}
              value={body}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
              rows={4}
              invalid={tooLong}
              invalidText={en.bugHunter.notebookAddTooLong
                .replace("{length}", String(trimmed.length))
                .replace("{max}", String(BUG_HUNTER_MEMORY_BODY_MAX))}
            />

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-[200px]">
                <Select
                  id="bug-hunter-notebook-scope"
                  labelText={en.bugHunter.notebookAddRepoLabel}
                  value={scope}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setScope(e.target.value)}
                >
                  {SWEEPABLE_REPOS.map(name => (
                    <SelectItem key={name} value={name} text={name} />
                  ))}
                  <SelectItem value={ALL_REPOS} text={en.bugHunter.notebookAddRepoAll} />
                </Select>
              </div>

              <label className="flex flex-col gap-1 text-xs text-typography-700 flex-1 min-w-[220px]">
                {en.bugHunter.notebookAddTagsLabel}
                <input
                  type="text"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder={en.bugHunter.notebookAddTagsPlaceholder}
                  className="h-10 rounded border border-border-light bg-white px-3 text-sm text-typography-900"
                  aria-label={en.bugHunter.notebookAddTagsLabel}
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-typography-700 cursor-pointer pb-2.5">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={e => setPinned(e.target.checked)}
                  className="cursor-pointer"
                />
                {en.bugHunter.notebookAddPinLabel}
                <Tooltip label={en.bugHunter.notebookAddPinTooltip} align="top">
                  <button type="button" className="cursor-pointer inline-flex items-center">
                    <TooltipIcon />
                  </button>
                </Tooltip>
              </label>
            </div>

            <div>
              <Button
                size="md"
                kind="primary"
                disabled={isAdding || !trimmed || tooLong}
                onClick={handleAdd}
              >
                {isAdding ? en.bugHunter.notebookAddButtonBusy : en.bugHunter.notebookAddButton}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-typography-500">{en.bugHunter.notebookReadOnly}</p>
      )}

      {retiring && (
        <ActionConfirmationPopup
          isOpen
          onClose={() => setRetiring(null)}
          title={en.bugHunter.notebookRetireConfirmTitle}
          description={en.bugHunter.notebookRetireConfirmBody}
          primaryButton={{ label: en.bugHunter.notebookRetireConfirm, onClick: handleRetire }}
          secondaryButton={{ label: en.bugHunter.cancel, onClick: () => setRetiring(null) }}
        />
      )}
    </div>
  );
};
