import React from "react";

import { TrashCan } from "@carbon/icons-react";
import { useDispatch } from "react-redux";

import { Button, Stack, TextArea, TextInput, Tile } from "@ally-ui-mono/ui-shared";
import { AddItemButton } from "@components";
import { RichTextEditor } from "@components/rich-text-editor";
import { en } from "@constants";
import { removePersonaChunk, updatePersona, upsertPersonaChunk } from "@reducer";
import { RoleplayPersona, RoleplayPersonaChunk } from "@src/types/roleplayStudio";
import { roleplayEntityId } from "@utils/roleplaySpec";

import { SpecTagList, SpecValue } from "./SpecField";
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
      <Stack gap={5}>
        <div className="flex flex-col gap-2">
          <p className="cds--label" style={{ marginBottom: 0 }}>
            {strings.identityCore}
          </p>
          <RichTextEditor
            value={persona.identityCore}
            onChange={html => dispatch(updatePersona({ identityCore: html }))}
            disabled={readOnly}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="cds--label" style={{ marginBottom: 0 }}>
            {strings.scenarioContext}
          </p>
          <RichTextEditor
            value={persona.scenarioContext}
            onChange={html => dispatch(updatePersona({ scenarioContext: html }))}
            disabled={readOnly}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="cds--label" style={{ marginBottom: 0 }}>
            {strings.chunks}
          </p>
          {persona.chunks.length === 0 && (
            <p className="text-typography-500">{strings.emptySection}</p>
          )}
          <div className="flex flex-col gap-3">
            {persona.chunks.map(chunk =>
              readOnly ? (
                <Tile key={chunk.id}>
                  <Stack gap={3}>
                    <SpecValue
                      label={strings.chunkTopics}
                      value={<SpecTagList items={chunk.topics} type="blue" />}
                      isEmpty={chunk.topics.length === 0}
                    />
                    <SpecValue label={strings.chunkContent} value={chunk.content} />
                  </Stack>
                </Tile>
              ) : (
                <Tile key={chunk.id}>
                  <Stack gap={3}>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <TextInput
                          id={`chunk-topics-${chunk.id}`}
                          labelText={strings.chunkTopics}
                          value={chunk.topics.join(", ")}
                          onChange={event =>
                            updateChunk(chunk, {
                              topics: event.target.value
                                .split(",")
                                .map(topic => topic.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </div>
                      <Button
                        kind="ghost"
                        size="md"
                        hasIconOnly
                        renderIcon={TrashCan}
                        iconDescription={strings.remove}
                        tooltipPosition="left"
                        onClick={() => dispatch(removePersonaChunk(chunk.id))}
                      />
                    </div>
                    <TextArea
                      id={`chunk-content-${chunk.id}`}
                      labelText={strings.chunkContent}
                      value={chunk.content}
                      onChange={event => updateChunk(chunk, { content: event.target.value })}
                      rows={3}
                    />
                  </Stack>
                </Tile>
              ),
            )}
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
      </Stack>
    </SpecSectionCard>
  );
};
