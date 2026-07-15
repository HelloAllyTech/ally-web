import React from "react";

import { TrashCan } from "@carbon/icons-react";
import { useDispatch } from "react-redux";

import { Button, Stack, TextArea, TextInput, Tile } from "@ally-ui-mono/ui-shared";
import { AddItemButton } from "@components";
import { en } from "@constants";
import { removeEngineeredEvent, upsertEngineeredEvent } from "@reducer";
import { RoleplayEngineeredEvent } from "@src/types/roleplayStudio";
import { roleplayEntityId } from "@utils/roleplaySpec";

import { SpecSectionCard } from "./SpecSectionCard";
import { SpecValue } from "./SpecField";

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
          <p className="text-typography-500">{strings.emptySection}</p>
        )}
        {events.map(event =>
          readOnly ? (
            <Tile key={event.id}>
              <Stack gap={3}>
                <span className="font-medium text-typography-900 break-words">
                  {event.name || "—"}
                </span>
                <SpecValue label={strings.eventDescription} value={event.description ?? ""} />
              </Stack>
            </Tile>
          ) : (
            <Tile key={event.id}>
              <Stack gap={3}>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <TextInput
                      id={`event-name-${event.id}`}
                      labelText={strings.eventName}
                      value={event.name ?? ""}
                      onChange={changeEvent => update(event, { name: changeEvent.target.value })}
                    />
                  </div>
                  <Button
                    kind="ghost"
                    size="md"
                    hasIconOnly
                    renderIcon={TrashCan}
                    iconDescription={strings.remove}
                    tooltipPosition="left"
                    onClick={() => dispatch(removeEngineeredEvent(event.id))}
                  />
                </div>
                <TextArea
                  id={`event-description-${event.id}`}
                  labelText={strings.eventDescription}
                  value={event.description ?? ""}
                  onChange={changeEvent => update(event, { description: changeEvent.target.value })}
                  rows={2}
                />
              </Stack>
            </Tile>
          ),
        )}
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
