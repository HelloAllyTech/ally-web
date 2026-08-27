import React, { useMemo, useRef, useState } from "react";

import { BarChart3, Book, Settings } from "@icons";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button, InlineNotification, SkeletonText, Tag, Tile } from "@ally-ui-mono/ui-shared";
import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { useCreateBuilderSessionMutation, useGetBuilderSessionsQuery } from "@api";
import { FilterDropdown, ListToolbar } from "@components";
import { BuilderNotificationInbox } from "@components/builder";
import { FilterChipProps } from "@components/types";
import { en, ROUTES } from "@constants";
import { BuilderSession, BuilderSessionStatus } from "@types";

import {
  BUILDER_STATUS_TAG_TYPE,
  builderTransition,
  prefersReducedMotion,
  staggerDelayMs,
} from "./builderMotion";

/** Sessions the agent cannot move forward without a person. */
const NEEDS_YOU: BuilderSessionStatus[] = ["WAITING_FOR_INPUT", "PRD_READY", "FAILED"];
const ACTIVE: BuilderSessionStatus[] = ["BUILDING", "INTERVIEWING"];

const ALL_STATUSES: BuilderSessionStatus[] = [
  "INTERVIEWING",
  "PRD_READY",
  "BUILDING",
  "WAITING_FOR_INPUT",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

interface SessionFilters {
  status: string[];
}

const formatCost = (usd: string) => {
  const value = Number(usd);
  if (!Number.isFinite(value) || value === 0) return null;
  return `$${value.toFixed(2)}`;
};

const SessionCard: React.FC<{
  session: BuilderSession;
  index: number;
  onOpen: (id: string) => void;
}> = ({ session, index, onOpen }) => {
  const strings = en.builder;
  const cost = formatCost(session.totalCostUsd);

  return (
    <Tile
      className="cursor-pointer hover:border-primary-400"
      style={
        prefersReducedMotion()
          ? undefined
          : {
              animation: "builderFadeIn 240ms both",
              animationDelay: `${staggerDelayMs(index)}ms`,
              transition: builderTransition(["border-color"], "fast"),
            }
      }
      onClick={() => onOpen(session.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(session.id);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-typography-900">{session.title}</p>
          <p className="mt-0.5 truncate text-xs text-typography-500">
            {session.repos?.length ? session.repos.join(", ") : strings.noReposYet}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Tag type={BUILDER_STATUS_TAG_TYPE[session.status]} size="sm">
            {strings.status[session.status] ?? session.status}
          </Tag>
          {/* Only shown once something has actually been spent — a "$0.00" on
              a fresh session is noise dressed up as information. */}
          {cost && <span className="text-xs text-typography-500">{cost}</span>}
        </div>
      </div>
      {session.currentStage && session.status === "BUILDING" && (
        <p className="mt-2 text-xs text-typography-600">{session.currentStage}</p>
      )}
    </Tile>
  );
};

/**
 * Builder mission control: start something, or pick up what is waiting.
 *
 * "Needs you" comes first because a backgrounded agent's most expensive
 * failure mode is silently waiting — a build blocked on an unanswered
 * question looks identical to a build still running unless the list says
 * otherwise.
 */
export const Builder: React.FC = () => {
  const strings = en.builder;
  const navigate = useNavigate();
  const [heroValue, setHeroValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BuilderSessionStatus[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const addFilterBtnRef = useRef<HTMLButtonElement>(null);

  const {
    data: sessions,
    isLoading,
    isError,
  } = useGetBuilderSessionsQuery(
    { status: statusFilter.length ? statusFilter : undefined },
    {
      // Interviews and builds move on their own; a stale list is how a waiting
      // question goes unnoticed.
      pollingInterval: 15000,
      skipPollingIfUnfocused: true,
    },
  );
  const [createSession, { isLoading: isCreating }] = useCreateBuilderSessionMutation();

  // The status facet is server-side (it's a real query param), but a title
  // search over an already-loaded list has no reason to round-trip — so it
  // narrows client-side, on top of whatever the server already filtered to.
  const visibleSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const all = sessions ?? [];
    return query ? all.filter(session => session.title.toLowerCase().includes(query)) : all;
  }, [sessions, searchQuery]);

  const { needsYou, active, recent } = useMemo(() => {
    return {
      needsYou: visibleSessions.filter(session => NEEDS_YOU.includes(session.status)),
      active: visibleSessions.filter(session => ACTIVE.includes(session.status)),
      recent: visibleSessions.filter(
        session => !NEEDS_YOU.includes(session.status) && !ACTIVE.includes(session.status),
      ),
    };
  }, [visibleSessions]);

  const statusOptions = useMemo(
    () => ALL_STATUSES.map(status => ({ label: strings.status[status] ?? status, value: status })),
    [strings.status],
  );

  const filterChips: FilterChipProps[] = useMemo(() => {
    if (statusFilter.length === 0) return [];
    return [
      {
        label: strings.filterStatusLabel,
        value: statusFilter.map(status => strings.status[status] ?? status).join(", "),
        allValue: ALL_STATUSES.map(status => strings.status[status] ?? status),
        onClear: () => setStatusFilter([]),
      },
    ];
  }, [statusFilter, strings.filterStatusLabel, strings.status]);

  const isFiltering = statusFilter.length > 0 || searchQuery.trim().length > 0;

  const open = (id: string) => navigate(ROUTES.BUILDER_SESSION(id));

  const start = async () => {
    const title = heroValue.trim();
    if (!title || isCreating) return;
    try {
      const session = await createSession({ title }).unwrap();
      setHeroValue("");
      // The typed sentence is the first thing the agent should react to, so it
      // travels with the navigation and is sent as the opening turn.
      navigate(ROUTES.BUILDER_SESSION(session.id), { state: { openingMessage: title } });
    } catch {
      toast.error(strings.createFailed);
    }
  };

  const renderGroup = (
    heading: string,
    group: BuilderSession[],
    startIndex: number,
  ): React.ReactNode =>
    group.length > 0 ? (
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-typography-500">
          {heading}
        </h2>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {group.map((session, index) => (
            <SessionCard
              key={session.id}
              session={session}
              index={startIndex + index}
              onOpen={open}
            />
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col overflow-y-auto p-6">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-typography-900">{strings.heroTitle}</h1>
            <p className="mt-1 text-sm text-typography-600">{strings.heroSubtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              iconDescription={strings.scoreboardLink}
              renderIcon={BarChart3}
              onClick={() => navigate(ROUTES.BUILDER_SCOREBOARD)}
            />
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              iconDescription={strings.knowledgeLink}
              renderIcon={Book}
              onClick={() => navigate(ROUTES.BUILDER_KNOWLEDGE)}
            />
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              iconDescription={strings.settingsLink}
              renderIcon={Settings}
              onClick={() => navigate(ROUTES.BUILDER_SETTINGS)}
            />
          </div>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <AutoExpandableTextarea
            id="builder-hero"
            value={heroValue}
            onChange={setHeroValue}
            placeholder={strings.heroPlaceholder}
            maxLines={4}
            disabled={isCreating}
            onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void start();
              }
            }}
          />
          <Button
            kind="primary"
            size="md"
            disabled={!heroValue.trim() || isCreating}
            onClick={() => void start()}
          >
            {strings.heroSubmit}
          </Button>
        </div>
      </header>

      <div className="mb-4">
        <BuilderNotificationInbox />
      </div>

      {isError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={strings.loadFailed}
          className="mb-4"
        />
      )}

      {!isLoading && sessions !== undefined && (
        <div className="mb-4">
          <ListToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder={strings.searchPlaceholder}
            filterChips={filterChips}
            addFilterCta={{ label: strings.filterButton, onClick: () => setIsFilterOpen(o => !o) }}
            addFilterButtonRef={addFilterBtnRef}
          />
          <FilterDropdown<SessionFilters>
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            sections={[{ id: "status", label: strings.filterStatusLabel, options: statusOptions }]}
            onApplyFilters={next => setStatusFilter((next.status ?? []) as BuilderSessionStatus[])}
            anchorRect={addFilterBtnRef.current?.getBoundingClientRect() ?? null}
            currentFilters={{ status: statusFilter }}
          />
        </div>
      )}

      {isLoading ? (
        <SkeletonText paragraph lineCount={4} />
      ) : visibleSessions.length ? (
        <>
          {renderGroup(strings.needsYouHeading, needsYou, 0)}
          {renderGroup(strings.activeHeading, active, needsYou.length)}
          {renderGroup(strings.recentHeading, recent, needsYou.length + active.length)}
        </>
      ) : isFiltering ? (
        <div className="mt-8 text-center">
          <p className="text-sm text-typography-600">{strings.noMatchingSessions}</p>
        </div>
      ) : (
        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-typography-800">{strings.emptyTitle}</p>
          <p className="mt-1 text-sm text-typography-600">{strings.emptyBody}</p>
        </div>
      )}
    </div>
  );
};
