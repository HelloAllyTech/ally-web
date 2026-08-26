import React, { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button, InlineNotification, SkeletonText, Tag, Tile } from "@ally-ui-mono/ui-shared";
import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { useCreateBuilderSessionMutation, useGetBuilderSessionsQuery } from "@api";
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

  const {
    data: sessions,
    isLoading,
    isError,
  } = useGetBuilderSessionsQuery(undefined, {
    // Interviews and builds move on their own; a stale list is how a waiting
    // question goes unnoticed.
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
  });
  const [createSession, { isLoading: isCreating }] = useCreateBuilderSessionMutation();

  const { needsYou, active, recent } = useMemo(() => {
    const all = sessions ?? [];
    return {
      needsYou: all.filter(session => NEEDS_YOU.includes(session.status)),
      active: all.filter(session => ACTIVE.includes(session.status)),
      recent: all.filter(
        session => !NEEDS_YOU.includes(session.status) && !ACTIVE.includes(session.status),
      ),
    };
  }, [sessions]);

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
        <h1 className="text-xl font-semibold text-typography-900">{strings.heroTitle}</h1>
        <p className="mt-1 text-sm text-typography-600">{strings.heroSubtitle}</p>
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

      {isError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={strings.loadFailed}
          className="mb-4"
        />
      )}

      {isLoading ? (
        <SkeletonText paragraph lineCount={4} />
      ) : sessions?.length ? (
        <>
          {renderGroup(strings.needsYouHeading, needsYou, 0)}
          {renderGroup(strings.activeHeading, active, needsYou.length)}
          {renderGroup(strings.recentHeading, recent, needsYou.length + active.length)}
        </>
      ) : (
        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-typography-800">{strings.emptyTitle}</p>
          <p className="mt-1 text-sm text-typography-600">{strings.emptyBody}</p>
        </div>
      )}
    </div>
  );
};
