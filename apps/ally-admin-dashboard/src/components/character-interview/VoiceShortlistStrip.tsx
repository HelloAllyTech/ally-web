import { useState } from "react";

import { useGetAvailableLanguageVoicesQuery } from "@api";
import { ArrowDown } from "@assets";
import { VoiceOptionRow } from "@components/voice-option";
import { useVoicePreview } from "@hooks/useVoicePreview";
import type { CharacterInterviewChatMessage } from "@types";

import { collectVoiceShortlists, type VoiceCatalogLanguage } from "./voiceShortlists";

/**
 * The voices this interview has shortlisted, kept playable above the composer.
 *
 * The answer cards can audition a voice, but only while they are the live
 * question: a card locks once answered, and an admin who replies by typing
 * never gets a card at all. Either way the shortlist — the useful part of what
 * the agent worked out — stops being playable exactly when they might want to
 * compare it. This keeps every language's shortlist to hand for the rest of
 * the session.
 *
 * Deliberately audition-only. Answering stays in one place (the card, or a
 * typed turn) rather than becoming two competing controls that can disagree
 * about what the character's voice is.
 */

interface VoiceShortlistStripProps {
  messages: CharacterInterviewChatMessage[];
}

export const VoiceShortlistStrip = ({ messages }: VoiceShortlistStripProps) => {
  const { data: catalogLanguages = [] } = useGetAvailableLanguageVoicesQuery({
    active: true,
    voicesNeeded: true,
  }) as { data: VoiceCatalogLanguage[] };
  const { playingVoiceId, isLoading, play, pause } = useVoicePreview();
  const [isOpen, setIsOpen] = useState(true);

  const shortlists = collectVoiceShortlists(messages, catalogLanguages);
  if (shortlists.length === 0) return null;

  return (
    <div
      className="mb-2 rounded border border-border-light bg-neutral-50"
      data-testid="voice-shortlist-strip"
    >
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-typography-800"
      >
        <span>
          Voices shortlisted
          {shortlists.length > 1 ? ` · ${shortlists.length} languages` : ""}
        </span>
        <span className={`transition-transform ${isOpen ? "" : "-rotate-90"}`}>
          <ArrowDown />
        </span>
      </button>

      {isOpen && (
        <div className="max-h-56 overflow-y-auto custom-scrollbar border-t border-border-light">
          {shortlists.map(shortlist => (
            <div
              key={shortlist.languageId}
              className="border-b border-border-light last:border-b-0"
            >
              <div className="px-3 pt-2 flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-typography-600">
                  {shortlist.languageLabel}
                </span>
                {shortlist.noneChosen && (
                  <span className="text-xs text-typography-500">· no voice</span>
                )}
              </div>
              {shortlist.options.map(option => (
                <div key={option.id}>
                  <VoiceOptionRow
                    option={{ value: option.id, label: option.label }}
                    // Audition only: the strip never answers the question.
                    onSelect={() => void play(option.id)}
                    isSelected={shortlist.chosenVoiceId === option.id}
                    isPlaying={playingVoiceId === option.id && !isLoading}
                    isLoading={playingVoiceId === option.id && isLoading}
                    onPlay={voiceId => void play(voiceId)}
                    onPause={pause}
                  />
                  {option.description && (
                    <p className="px-3 pb-2 -mt-1 text-xs text-typography-600">
                      {option.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
