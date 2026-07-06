import React from "react";

import { useDispatch } from "react-redux";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { AddItemButton, FormLabel } from "@components";
import { RichTextEditor } from "@components/rich-text-editor";
import { en } from "@constants";
import { removePersonaChunk, updatePersona, upsertPersonaChunk } from "@reducer";
import { RoleplayPersona, RoleplayPersonaChunk } from "@src/types/roleplayStudio";
import { roleplayEntityId } from "@utils/roleplaySpec";

import { SpecSectionCard } from "./SpecSectionCard";

interface PersonaBibleSectionProps {
  persona: RoleplayPersona;
  readOnly?: boolean;
}

/** Identity core + scenario context (rich text) and the persona chunk list. */
export const PersonaBibleSection: React.FC<PersonaBibleSectionProps> = ({
  persona,
  readOnly = false,
}) => {
  const strings = en.roleplayStudio.spec;
  const dispatch = useDispatch();

  const updateChunk = (chunk: RoleplayPersonaChunk, patch: Partial<RoleplayPersonaChunk>) =>
    dispatch(upsertPersonaChunk({ ...chunk, ...patch }));

  return (
    <SpecSectionCard title={strings.personaBible} sections={["persona"]}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <FormLabel>{strings.identityCore}</FormLabel>
          <RichTextEditor
            value={persona.identityCore}
            onChange={html => dispatch(updatePersona({ identityCore: html }))}
            disabled={readOnly}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FormLabel>{strings.scenarioContext}</FormLabel>
          <RichTextEditor
            value={persona.scenarioContext}
            onChange={html => dispatch(updatePersona({ scenarioContext: html }))}
            disabled={readOnly}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FormLabel>{strings.chunks}</FormLabel>
          {persona.chunks.length === 0 && (
            <p className="text-sm text-typography-500">{strings.emptySection}</p>
          )}
          <div className="flex flex-col gap-3">
            {persona.chunks.map(chunk => (
              <div
                key={chunk.id}
                className="rounded-md border border-border-light p-3 flex flex-col gap-2"
              >
                <div className="flex items-start gap-2">
                  <input
                    value={chunk.topics.join(", ")}
                    disabled={readOnly}
                    placeholder={strings.chunkTopics}
                    onChange={event =>
                      updateChunk(chunk, {
                        topics: event.target.value
                          .split(",")
                          .map(topic => topic.trim())
                          .filter(Boolean),
                      })
                    }
                    className="flex-1 rounded-md border border-border-light px-3 py-1.5 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => dispatch(removePersonaChunk(chunk.id))}
                      className="text-xs text-typography-600 hover:text-destructive-500 py-1.5 shrink-0"
                    >
                      {strings.remove}
                    </button>
                  )}
                </div>
                <AutoExpandableTextarea
                  value={chunk.content}
                  onChange={content => updateChunk(chunk, { content })}
                  placeholder={strings.chunkContent}
                  disabled={readOnly}
                  minHeight={48}
                  maxLines={10}
                  className="w-full rounded-md border border-border-light px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50"
                />
              </div>
            ))}
          </div>
          {!readOnly && (
            <AddItemButton
              label={strings.addChunk}
              onClick={() =>
                dispatch(
                  upsertPersonaChunk({ id: roleplayEntityId("chunk"), topics: [], content: "" }),
                )
              }
            />
          )}
        </div>
      </div>
    </SpecSectionCard>
  );
};
