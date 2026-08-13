import React, { useEffect, useState } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared/index";
import { PauseIcon, PlayIcon, Trash } from "@assets";
import { EmojiPickerComponent, TimeInput, TagList, HelperTag } from "@components";
import {
  EditableTextPopup,
  NumberInput,
  TextDropdown,
  Switch,
  SelectComponent,
  EditableTriggerConditionsPopup,
  TextareaWithTriggerDropdown,
  Status,
} from "@components/notion-table";
import { DETECTION_CONFIG_FIELDS } from "@constants";
import {
  formatCapitalizedEnum,
  isInfinityValue,
  normalizeDetectionConfigValue,
  getInfinityDisplay,
  toggleInfinityValue,
  getStatusColor,
} from "@utils";

import { cellTypes } from "./utils";

/**
 * normalText columns whose value is an identifier, not prose.
 *
 * Everything else is passed through `formatCapitalizedEnum`, which lower-cases
 * and swaps separators for spaces — fine for an enum like SHOULD_NOT_DO, but it
 * silently corrupts values an operator is meant to copy verbatim into a provider
 * config: `en-IN-Chirp3-HD-Kore` becomes `en in chirp3 hd kore`, `nova-3` becomes
 * `Nova 3`, `pa-Guru-IN` becomes `pa guru in`.
 */
const VERBATIM_TEXT_COLUMN_IDS = new Set([
  "eventCode",
  "promptCode",
  "config",
  "model",
  // Author-typed STT config label (it embeds the model id) and a comma-joined
  // list of language labels — both already read the way they should. Scoped to
  // these ids rather than a bare "name" so other tables keep their formatting.
  "configName",
  "usedBy",
  // Brand-cased provider label ("OpenAI", "vLLM").
  "providerLabel",
  // Model catalog: the display name carries vendor casing ("GPT-4o mini",
  // "Claude Haiku 4.5") and the runtime list is a comma-joined set of proper
  // nouns ("Voice, AI, Backend"). Sentence-casing either mangles it.
  "label",
  "runtimeSupport",
]);

export const Cell = ({
  value: initialValue,
  rowIndex: index,
  column: { dataType, options, minWidth, width, id, placeholder, maxLength },
  onCellChange,
  row,
}) => {
  // Extract value and disabled from the cell data structure
  const cellValue = initialValue?.value !== undefined ? initialValue.value : initialValue;
  const isDisabled = initialValue?.disabled !== undefined ? initialValue.disabled : false;
  const cellPlaceholder =
    initialValue?.placeholder !== undefined ? initialValue.placeholder : placeholder;
  const existingBehaviours = row?.behaviors?.value;
  const [value, setValue] = useState({ value: cellValue, update: false });

  useEffect(() => {
    const newCellValue = initialValue?.value !== undefined ? initialValue.value : initialValue;
    setValue({ value: newCellValue, update: false });
  }, [initialValue]);

  const updateCellValue = (newValue: any) => {
    setValue({ value: newValue, update: true });
    onCellChange({
      columnId: id,
      rowIndex: index,
      value: newValue,
      row: row,
      rowId: initialValue?.rowId,
    });
  };

  const onChangeSwitch = (checked: boolean) => {
    setValue({ value: checked, update: true });
    updateCellValue(checked);
  };

  const onChangeEmojiPicker = (newValue: string) => {
    setValue({ value: newValue, update: true });
    updateCellValue(newValue);
  };

  let element: React.ReactNode;

  /**
   * Renders time input with infinity toggle support
   * Used for startTime, endTime, and minGapTime fields
   */
  const CustomTimeInput = () => {
    const normalizedValue = normalizeDetectionConfigValue(value.value, id);
    const isInfinity = isInfinityValue(normalizedValue);

    // For startTime, always show input (no infinity state)
    if (id === DETECTION_CONFIG_FIELDS.START_TIME) {
      return (
        <div className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 rounded-md p-1">
          <TimeInput
            className="px-[0px]"
            value={normalizedValue || "00:00:00"}
            onBlur={updateCellValue}
            disabled={isDisabled}
          />
        </div>
      );
    }

    // For other time fields, support infinity toggle
    if (isInfinity) {
      return (
        <div
          onClick={isDisabled ? undefined : () => updateCellValue("00:00:00")}
          className={`px-1  ${isDisabled ? "cursor-not-allowed text-typography-500" : "cursor-pointer"}`}
        >
          {getInfinityDisplay(id)}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 rounded-md p-1">
        <TimeInput
          className="px-[0px]"
          value={normalizedValue}
          onBlur={updateCellValue}
          disabled={isDisabled}
        />
      </div>
    );
  };

  /**
   * Renders score input with infinity toggle support
   * Used for minScore and maxScore fields
   */
  const CustomScoreInput = () => {
    const normalizedValue = normalizeDetectionConfigValue(value.value, id);
    const isInfinity = isInfinityValue(normalizedValue);
    if (isInfinity) {
      return (
        <div
          className={isDisabled ? "cursor-not-allowed text-typography-500" : "cursor-pointer"}
          onClick={
            isDisabled
              ? undefined
              : () =>
                  updateCellValue(
                    toggleInfinityValue(normalizedValue, DETECTION_CONFIG_FIELDS.MAX_SCORE),
                  )
          }
        >
          {getInfinityDisplay(id)}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 rounded-md p-1">
        <NumberInput value={normalizedValue} onChange={updateCellValue} disabled={isDisabled} />
      </div>
    );
  };

  switch (dataType) {
    case cellTypes.normalText:
      if (id === "location" && row?.locationSlug) {
        element = (
          <div className="flex flex-col overflow-hidden">
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{value.value}</span>
            <span className="text-xs text-typography-500 overflow-hidden text-ellipsis whitespace-nowrap">
              {row.locationSlug}
            </span>
          </div>
        );
      } else {
        element = (
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {VERBATIM_TEXT_COLUMN_IDS.has(id) ? value.value : formatCapitalizedEnum(value.value)}
          </span>
        );
      }
      break;
    case cellTypes.wrapText:
      element = (
        <span className="block overflow-hidden text-ellipsis line-clamp-2 break-words">
          {value.value ?? ""}
        </span>
      );
      break;
    case cellTypes.image:
      element = (
        <div className="w-[100px] h-[56px] flex-shrink-0">
          <CustomImage
            src={value.value}
            alt="User badge"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
      );
      break;
    case cellTypes.editableText:
      element = (
        <EditableTextPopup
          value={value.value}
          width={width}
          minWidth={minWidth}
          onChange={updateCellValue}
          placeholder={cellPlaceholder}
          disabled={isDisabled}
          maxLength={maxLength}
        />
      );
      break;
    case cellTypes.dropdownSearchable:
      element = (
        <TextDropdown
          value={value.value}
          options={options}
          onChange={updateCellValue}
          placeholder={"Select an option"}
          searchPlaceholder="Search options..."
          isSearchable={true}
          disabled={isDisabled || value.value?.length > 0}
        />
      );
      break;
    case cellTypes.dropdown:
      element = (
        <TextDropdown
          value={value.value}
          // Cell-level options win over the column's, so a table can vary the
          // choices per row (and so options that load asynchronously reach the
          // cell without depending on the column pipeline re-running).
          options={initialValue?.options ?? options}
          onChange={updateCellValue}
          placeholder={"Select an option"}
          disabled={isDisabled}
        />
      );
      break;
    case cellTypes.number:
      element = (
        <NumberInput value={value.value} onChange={updateCellValue} disabled={isDisabled} />
      );
      break;
    case cellTypes.select:
      element = (
        <SelectComponent
          value={value.value}
          options={options}
          onChange={updateCellValue}
          placeholder="Select an option"
          disabled={isDisabled}
        />
      );
      break;
    case cellTypes.switch:
      element = (
        <Switch
          checked={value.value === "On" || value.value === true}
          onChange={onChangeSwitch}
          disabled={isDisabled}
        />
      );
      break;
    case cellTypes.emoji_select:
      element = (
        <EmojiPickerComponent
          onEmojiClick={onChangeEmojiPicker}
          buttonText={value.value}
          disabled={isDisabled}
        />
      );
      break;
    case cellTypes.triggerConditions: {
      element = (
        <EditableTriggerConditionsPopup
          eventType={row?.detectionType?.value}
          triggerCondition={value.value || {}}
          onChange={updateCellValue}
          width={width}
          minWidth={minWidth}
          disabled={isDisabled}
          currentEventId={row?.id?.value}
        />
      );
      break;
    }
    case cellTypes.timeInput:
      element = <CustomTimeInput />;
      break;
    case cellTypes.score:
      element = <CustomScoreInput />;
      break;
    case cellTypes.textAreaWithDropdown:
      element = (
        <TextareaWithTriggerDropdown
          value={value.value}
          onChange={updateCellValue}
          placeholder={cellPlaceholder}
          disabled={isDisabled}
        />
      );
      break;
    case cellTypes.tags:
      element = <TagList tags={value.value} />;
      break;
    case cellTypes.dropdownTags:
      element = (
        <HelperTag
          tags={existingBehaviours ?? []}
          updateTags={updateCellValue}
          disabled={isDisabled}
        />
      );
      break;
    case cellTypes.status:
      element = (
        <div className="flex items-center">
          <div className={`w-auto py-1 rounded-[4px] px-2 text-sm ${getStatusColor(value.value)}`}>
            {value.value === Status.ACTIVE
              ? formatCapitalizedEnum(Status.PUBLISHED)
              : formatCapitalizedEnum(value.value) || "--"}
          </div>
        </div>
      );
      break;
    case cellTypes.roles:
      element = (
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {value.value?.length
            ? value.value.map(role => formatCapitalizedEnum(role)).join(", ")
            : value.value
              ? formatCapitalizedEnum(value.value)
              : "--"}
        </span>
      );
      break;
    case cellTypes.actionItem:
      element = value.value ? (
        <div
          onClick={e => {
            e.stopPropagation();
            if (typeof value.value === "function") {
              value.value(row);
            }
          }}
          className="cursor-pointer text-red-500 hover:text-red-700 p-2 flex items-center"
        >
          <div className="w-4 h-4">
            <Trash />
          </div>
        </div>
      ) : (
        <span />
      );
      break;
    case cellTypes.voiceDropdown: {
      const voiceOptions = initialValue?.options ?? [];
      const onPlay = initialValue?.onPlay as ((voiceId: string) => void) | undefined;
      const onPause = initialValue?.onPause as (() => void) | undefined;
      const playingVoiceId = initialValue?.playingVoiceId as string | null;
      const isVoiceAudioLoading = Boolean(initialValue?.isAudioLoading);

      const voiceOptionRenderer = (
        option: { value: string; label: string },
        onSelect: (v: string) => void,
      ) => {
        const isCurrentVoice = playingVoiceId === option.value;
        const isLoading = isCurrentVoice && isVoiceAudioLoading;
        const isPlaying = isCurrentVoice && !isVoiceAudioLoading;
        const isSelected = (value.value ?? "") === option.value;
        // The empty-value option is a "clear/remove" action, not a real voice,
        // so it has nothing to preview.
        const isClearOption = !option.value;

        return (
          <div
            key={option.value}
            className="px-3 py-2 text-sm flex items-center justify-between gap-2 cursor-pointer hover:bg-background-secondary"
            onClick={() => onSelect(option.value)}
          >
            <span className={isSelected ? "text-primary-700 font-medium" : ""}>{option.label}</span>
            {!isClearOption && (
              <div
                className="flex items-center gap-1 flex-shrink-0"
                onClick={e => e.stopPropagation()}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-typography-800 rounded-full animate-spin" />
                ) : isPlaying ? (
                  <button type="button" onClick={() => onPause?.()}>
                    <PauseIcon className="w-5 h-5" />
                  </button>
                ) : (
                  <button type="button" onClick={() => onPlay?.(option.value)}>
                    <PlayIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      };

      element = (
        <TextDropdown
          value={value.value ?? ""}
          options={voiceOptions}
          onChange={updateCellValue}
          placeholder="Select voice"
          isSearchable={true}
          disabled={isDisabled}
          optionRenderer={voiceOptionRenderer}
        />
      );
      break;
    }
    case cellTypes.previewAudio: {
      const previewValue = initialValue ?? {};
      const isPreviewLoading = Boolean(previewValue.isLoading);
      const isPreviewPlaying = Boolean(previewValue.isPlaying);
      const isPreviewDisabled = Boolean(previewValue.disabled);

      element = (
        <div className="flex items-center justify-center w-full">
          <button
            type="button"
            aria-label={isPreviewPlaying ? "Pause voice preview" : "Play voice preview"}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-border-light hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPreviewDisabled || (isPreviewLoading && !isPreviewPlaying)}
            onClick={e => {
              e.stopPropagation();
              if (isPreviewPlaying) {
                previewValue.onPause?.();
                return;
              }
              previewValue.onPlay?.();
            }}
          >
            {isPreviewLoading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-typography-800 rounded-full animate-spin" />
            ) : isPreviewPlaying ? (
              <PauseIcon className="w-4 h-4" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      );
      break;
    }
    default:
      element = <span />;
      break;
  }

  return element;
};
