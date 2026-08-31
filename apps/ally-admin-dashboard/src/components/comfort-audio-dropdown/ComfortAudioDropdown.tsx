import { useGetComfortAudioTracksQuery } from "@api";
import { en } from "@constants";

import { DropdownField } from "../dropdown-field";

interface ComfortAudioDropdownProps {
  id?: string;
  label?: string;
  /** react-hook-form mode (v1 Basic Settings). */
  formMethods?: any;
  isMandatory?: boolean;
  /** Controlled mode (v2 Redux studio): pass value + onChange instead of formMethods. */
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Data-driven picker for the comfort-audio track. Lists tracks from the shared
 * library and stores the selected track's public URL (which rides the scenario
 * metadata / spec to the voice worker). Includes a native audio preview of the
 * current selection. Deselecting falls back to the default room tone.
 *
 * Works in two modes: react-hook-form (`formMethods` + `id`)
 * v1, and controlled (`value` + `onChange`) for the Redux-driven v2 studio.
 */
export const ComfortAudioDropdown: React.FC<ComfortAudioDropdownProps> = ({
  id = "comfortAudioUrl",
  label = en.comfortAudio.trackLabel,
  formMethods,
  isMandatory,
  value,
  onChange,
}) => {
  // includeArchived so a scenario that already points at an archived track can
  // still show and keep that selection (see options filter below).
  const { data, isLoading } = useGetComfortAudioTracksQuery({ includeArchived: true });
  const tracks = data?.tracks ?? [];

  const isControlled = typeof onChange === "function";
  const selectedUrl = isControlled ? value : (formMethods?.watch(id) as string | undefined);

  // Archived tracks can't be newly selected, but the currently-selected one
  // stays in the list (labelled) so existing roleplays keep working until the
  // author picks something else.
  const options = tracks
    .filter(track => !track.isArchived || track.audioUrl === selectedUrl)
    .map(track => ({
      value: track.audioUrl,
      label: track.isArchived ? `${track.name}${en.comfortAudio.archivedOptionSuffix}` : track.name,
    }));

  return (
    <div className="flex flex-col gap-2">
      <label className="text-typography-900 text-base flex items-center gap-1">
        {label}
        {isMandatory && <span className="text-destructive-500">*</span>}
      </label>
      {isLoading ? (
        <span className="text-typography-500 text-sm">{en.comfortAudio.loadingTracks}</span>
      ) : options.length === 0 ? (
        <span className="text-typography-500 text-sm">{en.comfortAudio.noTracks}</span>
      ) : isControlled ? (
        <DropdownField
          id={id}
          label={label}
          options={options}
          isMandatory={isMandatory}
          placeholder={en.comfortAudio.trackPlaceholder}
          allowDeselect
          value={value ?? ""}
          onChange={onChange}
        />
      ) : (
        <DropdownField
          id={id}
          label={label}
          formMethods={formMethods}
          options={options}
          isMandatory={isMandatory}
          placeholder={en.comfortAudio.trackPlaceholder}
          allowDeselect
        />
      )}
      {selectedUrl ? (
        <audio controls src={selectedUrl} className="w-full mt-1">
          <track kind="captions" />
        </audio>
      ) : null}
    </div>
  );
};
