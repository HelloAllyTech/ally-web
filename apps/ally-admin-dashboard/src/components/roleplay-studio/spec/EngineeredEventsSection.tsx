import React from "react";

import { useDispatch } from "react-redux";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { AddItemButton } from "@components";
import { en } from "@constants";
import { removeEngineeredEvent, upsertEngineeredEvent } from "@reducer";
import { RoleplayEngineeredEvent } from "@src/types/roleplayStudio";
import { roleplayEntityId } from "@utils/roleplaySpec";

import { SpecSectionCard } from "./SpecSectionCard";

interface EngineeredEventsSectionProps {
  events: RoleplayEngineeredEvent[];
  readOnly?: boolean;
}

/**
 * Engineered events list. The event contract is intentionally loose — the
 * copilot authors these — so the editor surfaces name + description and
 * preserves any extra keys untouched.
 */
export const EngineeredEventsSection: React.FC<EngineeredEventsSectionProps> = ({
  events,
  readOnly = false,
}) => {
  const strings = en.roleplayStudio.spec;
  const dispatch = useDispatch();

  const update = (event: RoleplayEngineeredEvent, patch: Partial<RoleplayEngineeredEvent>) =>
    dispatch(upsertEngineeredEvent({ ...event, ...patch }));

  return (
    <SpecSectionCard
      title={strings.engineeredEvents}
      sections={["engineeredEvents"]}
      defaultExpanded={false}
    >
      <div className="flex flex-col gap-3">
        {events.length === 0 && (
          <p className="text-sm text-typography-500">{strings.emptySection}</p>
        )}
        {events.map(event => (
          <div
            key={event.id}
            className="rounded-md border border-border-light p-3 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <input
                value={event.name ?? ""}
                disabled={readOnly}
                placeholder={strings.eventName}
                onChange={changeEvent => update(event, { name: changeEvent.target.value })}
                className="flex-1 rounded-md border border-border-light px-3 py-1.5 text-sm font-medium outline-none focus:border-primary-500 disabled:bg-neutral-50"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => dispatch(removeEngineeredEvent(event.id))}
                  className="text-xs text-typography-600 hover:text-destructive-500 shrink-0"
                >
                  {strings.remove}
                </button>
              )}
            </div>
            <AutoExpandableTextarea
              value={event.description ?? ""}
              onChange={description => update(event, { description })}
              placeholder={strings.eventDescription}
              disabled={readOnly}
              minHeight={40}
              maxLines={8}
              className="w-full rounded-md border border-border-light px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50"
            />
          </div>
        ))}
        {!readOnly && (
          <AddItemButton
            label={strings.addEvent}
            onClick={() =>
              dispatch(
                upsertEngineeredEvent({
                  id: roleplayEntityId("event"),
                  name: "",
                  description: "",
                }),
              )
            }
          />
        )}
      </div>
    </SpecSectionCard>
  );
};
