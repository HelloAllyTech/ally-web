import { FC } from "react";

import { Controller, useFormContext } from "react-hook-form";

import { TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import { TooltipIcon } from "@assets";
import { TRACK_GAME_CATALOG } from "@constants";
import { TrackFormValues, TrackGameKey, TrackItemType } from "@types";

import { ItemEditorFrame } from "./ItemEditorFrame";

interface GameItemEditorProps {
  sectionIndex: number;
  itemIndex: number;
  onDelete: () => void;
}

/**
 * Game component editor. Deliberately the shortest one in the builder: an
 * author picks a game and, if they want, writes a line of framing. There is no
 * score, threshold or attempt limit because a game never gates the course —
 * the banner below says so, since that is the one thing an author is likely to
 * assume works the other way.
 */
export const GameItemEditor: FC<GameItemEditorProps> = ({ sectionIndex, itemIndex, onDelete }) => {
  const { control } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}` as const;

  return (
    <ItemEditorFrame
      sectionIndex={sectionIndex}
      itemIndex={itemIndex}
      type={TrackItemType.GAME}
      onDelete={onDelete}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-1">
            <label className="text-sm font-medium text-typography-800">Game</label>
            <Tooltip
              label="Which game the learner plays. Games are breaks, not exercises — pick one that fits the mood of the section it sits in."
              align="top"
            >
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
          </span>

          <Controller
            control={control}
            name={`${base}.game.gameKey`}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                {TRACK_GAME_CATALOG.map(game => {
                  const selected = field.value === game.key;
                  return (
                    <button
                      key={game.key}
                      type="button"
                      onClick={() => field.onChange(game.key as TrackGameKey)}
                      aria-pressed={selected}
                      className={`text-left rounded-md border px-3 py-3 transition-colors ${
                        selected
                          ? "border-primary-400 bg-primary-50"
                          : "border-border-light hover:bg-secondary-50"
                      }`}
                    >
                      <span className="block text-sm font-medium text-typography-900">
                        {game.name}
                      </span>
                      <span className="block text-xs text-typography-500 mt-0.5">
                        {game.description}
                      </span>
                      <span className="block text-xs text-typography-400 mt-1">
                        Typically {game.typicalPlay}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-1">
            <label className="text-sm font-medium text-typography-800">Intro (optional)</label>
            <Tooltip
              label="A line shown above the game, e.g. 'Shake that last call off before the next roleplay.' Leave it blank to show just the game."
              align="top"
            >
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
          </span>
          <Controller
            control={control}
            name={`${base}.game.intro`}
            render={({ field }) => (
              <TextArea
                id={`${base}.game.intro`}
                labelText="Intro"
                hideLabel
                rows={2}
                placeholder="Shake that last call off before the next roleplay."
                className="w-full"
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <p className="rounded-md bg-secondary-50 px-3 py-2 text-xs text-typography-600">
          Games never block a learner. This component completes as soon as it is opened, so they can
          play it, replay it, or move straight past it — and nothing they score here counts towards
          the course.
        </p>
      </div>
    </ItemEditorFrame>
  );
};
