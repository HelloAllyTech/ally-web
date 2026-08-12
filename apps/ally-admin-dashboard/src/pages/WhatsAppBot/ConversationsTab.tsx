import React, { useCallback, useMemo, useState } from "react";

import { Chat, Eye, Unarchive, Unpublish } from "@icons";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  CarbonDropdown,
  Checkbox,
  DatePicker,
  DatePickerInput,
  InlineNotification,
  SkeletonText,
  Tag,
} from "@ally-ui-mono/ui-shared";
import {
  useBlockWaContactMutation,
  useGetWaConversationLanguagesQuery,
  useGetWaConversationsQuery,
  useRevealWaContactPhoneMutation,
  useUnblockWaContactMutation,
} from "@api";
import {
  ActionConfirmationPopup,
  EmptyState,
  EntityTable,
  EntityTableColumn,
  EntityTableSort,
  ListPagination,
  ListToolbar,
} from "@components";
import { AppTooltip } from "@components/app-tooltip";
import { en, TooltipLocation } from "@constants";
import { WaConversationSummary, WaHandledBy } from "@types";
import { formatDate, formatRelativeTime } from "@utils";

import { ConversationDrawer } from "./ConversationDrawer";

const PAGE_SIZE = 25;

interface FilterItem {
  id: string;
  label: string;
}

/** `yyyy-mm-dd` in LOCAL time — toISOString would shift the date for anyone east or west of UTC. */
const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

/**
 * The server's `to` bound is exclusive, so a date picked as the 12th has to become the start of the
 * 13th. Without this the picker silently excludes the whole day the reader just chose — the kind of
 * off-by-one that reads as missing data rather than a filter bug.
 */
const endOfDayIso = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
};

/**
 * Conversation log.
 *
 * Phone numbers are shown as the last four digits and nothing else. That is not decoration: these are
 * identifiable numbers of mental healthcare workers alongside their clinical questions, and this
 * screen gets screenshotted. A full number requires an explicit per-contact reveal, which the server
 * logs.
 */
export const ConversationsTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [declinedOnly, setDeclinedOnly] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [language, setLanguage] = useState("");
  const [handledBy, setHandledBy] = useState<WaHandledBy | "">("");
  // Newest first. Sorting is server-side because the list is server-paged — reordering the 25 rows
  // on screen would present itself as sorting all 342 and quietly be wrong.
  const [sort, setSort] = useState<EntityTableSort>({ key: "lastMessageAt", direction: "desc" });
  /**
   * The open thread lives in the URL, not in component state.
   *
   * Two things follow from that, both of which an operator actually needs: a thread can be sent to a
   * colleague as a link, and the unanswered queue can hand off to it — "which conversation did this
   * gap come from" is one click instead of a search through the log.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get("conversation");
  const setOpenId = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set("conversation", id);
      else next.delete("conversation");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );
  const [blockTarget, setBlockTarget] = useState<WaConversationSummary | null>(null);
  /** Numbers revealed in THIS session only. Never persisted, never sent back. */
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const { data, isLoading, isFetching, isError } = useGetWaConversationsQuery({
    limit: PAGE_SIZE,
    offset,
    search: search.trim() || undefined,
    declinedOnly: declinedOnly || undefined,
    from: from || undefined,
    // Exclusive upper bound server-side, so a "to" of the 12th must mean end-of-day on the 12th or
    // the picker silently excludes the day the reader just chose.
    to: to ? endOfDayIso(to) : undefined,
    language: language || undefined,
    handledBy: handledBy || undefined,
    sortBy: sort.key,
    sortDir: sort.direction,
  });

  const { data: languages = [] } = useGetWaConversationLanguagesQuery();

  const [revealPhone] = useRevealWaContactPhoneMutation();
  const [blockContact] = useBlockWaContactMutation();
  const [unblockContact] = useUnblockWaContactMutation();

  // Built in the component, not at module scope: a constants read on import has broken unrelated
  // suites in this app before.
  const languageItems: FilterItem[] = useMemo(
    () => [
      { id: "", label: en.whatsappBot.conversations.anyLanguage },
      ...languages.map(code => ({ id: code, label: code })),
    ],
    [languages],
  );
  const outcomeItems: FilterItem[] = useMemo(
    () => [
      { id: "", label: en.whatsappBot.conversations.anyOutcome },
      ...Object.values(WaHandledBy).map(value => ({
        id: value,
        label: en.whatsappBot.conversations.handledBy[value] ?? value,
      })),
    ],
    [],
  );

  const conversations = data?.conversations ?? [];
  const total = data?.count ?? 0;

  const handleReveal = useCallback(
    async (row: WaConversationSummary) => {
      try {
        const { phoneE164 } = await revealPhone(row.contactId).unwrap();
        setRevealed(current => ({ ...current, [row.contactId]: phoneE164 }));
        // Told plainly that this was recorded — an admin should know the action left a trace.
        toast.success(en.whatsappBot.conversations.revealed);
      } catch {
        toast.error(en.whatsappBot.conversations.revealFailed);
      }
    },
    [revealPhone],
  );

  const handleBlockConfirmed = useCallback(async () => {
    if (!blockTarget) return;
    try {
      if (blockTarget.blockedAt) {
        await unblockContact(blockTarget.contactId).unwrap();
      } else {
        await blockContact({ id: blockTarget.contactId }).unwrap();
      }
      toast.success(en.whatsappBot.conversations.blocked);
    } catch {
      toast.error(en.whatsappBot.conversations.revealFailed);
    } finally {
      setBlockTarget(null);
    }
  }, [blockTarget, blockContact, unblockContact]);

  const columns: EntityTableColumn<WaConversationSummary>[] = useMemo(
    () => [
      {
        key: "contact",
        label: en.whatsappBot.conversations.columnContact,
        render: row => (
          <span className="flex items-center gap-2">
            {/* The dots are decoration; a screen reader would otherwise read "bullet bullet
                bullet bullet 4821". The label says what the number actually is. */}
            {revealed[row.contactId] ? (
              <span className="font-mono text-sm tabular-nums">{revealed[row.contactId]}</span>
            ) : (
              <span
                className="font-mono text-sm tabular-nums"
                aria-label={`${en.whatsappBot.conversations.numberEnding} ${row.phoneLast4}`}
              >
                <span aria-hidden="true">••••</span>
                {row.phoneLast4}
              </span>
            )}
            {row.blockedAt && (
              <Tag type="red" size="sm">
                {en.whatsappBot.conversations.blockedBadge}
              </Tag>
            )}
          </span>
        ),
      },
      {
        key: "lastMessageAt",
        label: en.whatsappBot.conversations.columnLast,
        sortKey: "lastMessageAt",
        render: row => (
          // Relative, with the exact timestamp one hover away. A log is read to answer "is this
          // still happening?", and an absolute date makes the reader do the arithmetic.
          <span className="text-typography-600" title={formatDate(row.lastMessageAt)}>
            {formatRelativeTime(row.lastMessageAt)}
          </span>
        ),
      },
      {
        key: "messageCount",
        label: en.whatsappBot.conversations.columnMessages,
        sortKey: "messageCount",
        render: row => <span className="tabular-nums">{row.messageCount}</span>,
      },
      {
        key: "lastLanguage",
        label: en.whatsappBot.conversations.columnLanguage,
        render: row => <span className="text-typography-600">{row.lastLanguage ?? "—"}</span>,
      },
    ],
    [revealed],
  );

  const isFiltered =
    search.trim().length > 0 || declinedOnly || Boolean(from || to || language || handledBy);

  return (
    <div className="pt-4">
      <p className="text-sm text-typography-600 pb-4">{en.whatsappBot.conversations.subtitle}</p>

      <ListToolbar
        searchValue={search}
        onSearchChange={value => {
          setSearch(value);
          setOffset(0);
        }}
        placeholder={en.whatsappBot.conversations.searchPlaceholder}
      />

      <div className="flex flex-wrap items-end gap-4 pt-3">
        <DatePicker
          datePickerType="single"
          dateFormat="Y-m-d"
          value={from}
          onChange={([date]: Date[]) => {
            setFrom(date ? toIsoDate(date) : "");
            setOffset(0);
          }}
        >
          <DatePickerInput
            id="wa-from"
            size="sm"
            placeholder="yyyy-mm-dd"
            labelText={en.whatsappBot.conversations.dateFrom}
          />
        </DatePicker>

        <DatePicker
          datePickerType="single"
          dateFormat="Y-m-d"
          value={to}
          onChange={([date]: Date[]) => {
            setTo(date ? toIsoDate(date) : "");
            setOffset(0);
          }}
        >
          <DatePickerInput
            id="wa-to"
            size="sm"
            placeholder="yyyy-mm-dd"
            labelText={en.whatsappBot.conversations.dateTo}
          />
        </DatePicker>

        <CarbonDropdown
          id="wa-language"
          size="sm"
          className="w-[180px]"
          titleText={en.whatsappBot.conversations.languageFilter}
          label={en.whatsappBot.conversations.anyLanguage}
          items={languageItems}
          selectedItem={languageItems.find(item => item.id === language) ?? languageItems[0]}
          itemToString={(item: FilterItem | null) => item?.label ?? ""}
          onChange={({ selectedItem }: { selectedItem: FilterItem | null }) => {
            if (!selectedItem) return;
            setLanguage(selectedItem.id);
            setOffset(0);
          }}
        />

        <CarbonDropdown
          id="wa-outcome"
          size="sm"
          className="w-[220px]"
          titleText={en.whatsappBot.conversations.outcomeFilter}
          label={en.whatsappBot.conversations.anyOutcome}
          items={outcomeItems}
          selectedItem={outcomeItems.find(item => item.id === handledBy) ?? outcomeItems[0]}
          itemToString={(item: FilterItem | null) => item?.label ?? ""}
          onChange={({ selectedItem }: { selectedItem: FilterItem | null }) => {
            if (!selectedItem) return;
            setHandledBy(selectedItem.id as WaHandledBy | "");
            setOffset(0);
          }}
        />

        {isFiltered && (
          <button
            className="pb-2 text-sm text-primary-500 underline"
            onClick={() => {
              setSearch("");
              setDeclinedOnly(false);
              setFrom("");
              setTo("");
              setLanguage("");
              setHandledBy("");
              setOffset(0);
            }}
          >
            {en.whatsappBot.conversations.clearFilters}
          </button>
        )}
      </div>

      <div className="py-3">
        <Checkbox
          id="wa-declined-only"
          labelText={en.whatsappBot.conversations.declinedOnly}
          checked={declinedOnly}
          onChange={(_event: unknown, { checked }: { checked: boolean }) => {
            setDeclinedOnly(checked);
            setOffset(0);
          }}
        />
      </div>

      {isError && (
        <InlineNotification
          kind="error"
          title={en.whatsappBot.conversations.loadError}
          lowContrast
          hideCloseButton
        />
      )}

      {/* A skeleton rather than the word "Loading": it holds the table's shape, so the page does not
          jump when rows arrive, and it matches how the rest of this app loads a list. */}
      {isLoading && !conversations.length && (
        <div className="py-6">
          <SkeletonText paragraph lineCount={6} />
        </div>
      )}

      {!isLoading && !isError && conversations.length === 0 && (
        <EmptyState
          title={
            isFiltered
              ? en.whatsappBot.conversations.emptyFiltered
              : en.whatsappBot.conversations.empty
          }
          subtitle={
            isFiltered
              ? en.whatsappBot.conversations.emptyFilteredSubtitle
              : en.whatsappBot.conversations.emptySubtitle
          }
          hideActionButton
        />
      )}

      {conversations.length > 0 && (
        <>
          {/* Explicit actions rather than the onEdit/onDelete sugar: a pencil for "read a thread" and
              a bin for "block a number" would both misdescribe what happens. Nothing here is
              editable and nothing here is deleted. */}
          <EntityTable
            columns={columns}
            rows={conversations}
            sort={sort}
            onSortChange={next => {
              setSort(next);
              // Back to page one: keeping the offset after a re-sort lands the reader in the middle
              // of a list they have never seen the start of.
              setOffset(0);
            }}
            rowClassName={row => (row.blockedAt ? "opacity-60" : "")}
            actions={[
              {
                key: "open",
                label: en.whatsappBot.conversations.threadHeading,
                icon: <Chat size={18} />,
                onClick: row => setOpenId(row.id),
              },
              {
                key: "reveal",
                label: en.whatsappBot.conversations.reveal,
                // Tooltip text is authored by a superadmin under Manage Tooltips and is inactive
                // until they enable it, so this renders the icon unchanged until then.
                icon: (
                  <AppTooltip location={TooltipLocation.WA_REVEAL_PHONE}>
                    <Eye size={18} />
                  </AppTooltip>
                ),
                // Hidden once revealed in this session, so the action does not invite a second
                // logged call for a number already on screen.
                hidden: row => Boolean(revealed[row.contactId]),
                onClick: row => void handleReveal(row),
              },
              {
                key: "block",
                label: en.whatsappBot.conversations.block,
                icon: (
                  <AppTooltip location={TooltipLocation.WA_BLOCK_CONTACT}>
                    <Unpublish size={18} />
                  </AppTooltip>
                ),
                hidden: row => Boolean(row.blockedAt),
                onClick: row => setBlockTarget(row),
              },
              {
                key: "unblock",
                label: en.whatsappBot.conversations.unblock,
                icon: <Unarchive size={18} />,
                hidden: row => !row.blockedAt,
                onClick: row => setBlockTarget(row),
              },
            ]}
          />

          <ListPagination
            offset={offset}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={setOffset}
            isFetching={isFetching}
          />
        </>
      )}

      <ConversationDrawer conversationId={openId} onClose={() => setOpenId(null)} />

      <ActionConfirmationPopup
        isOpen={Boolean(blockTarget)}
        onClose={() => setBlockTarget(null)}
        title={en.whatsappBot.conversations.blockConfirmTitle}
        description={en.whatsappBot.conversations.blockConfirmDescription}
        primaryButton={{
          label: blockTarget?.blockedAt
            ? en.whatsappBot.conversations.unblock
            : en.whatsappBot.conversations.block,
          onClick: () => void handleBlockConfirmed(),
        }}
        secondaryButton={{ label: en.common.cancel, onClick: () => setBlockTarget(null) }}
      />
    </div>
  );
};
