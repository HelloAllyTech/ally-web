import { FC } from "react";

import { toast } from "sonner";

import { en } from "@src/constants";

import { inputClass, secondaryButtonClass } from "./formControls";

/** The talker-facing URL, with Copy and Open. The link only works while the helpline is enabled. */
export const PublicLinkRow: FC<{ url: string }> = ({ url }) => {
  const text = en.textHelpline;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(text.linkCopied);
    } catch {
      // No clipboard permission, or an insecure context where `navigator.clipboard` is undefined.
      toast.error(text.linkCopyFailed);
    }
  };

  return (
    <div className="flex flex-col gap-2" data-testid="text-helpline-public-link">
      <span className="text-sm text-typography-700 font-normal">{text.publicLinkLabel}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          readOnly
          value={url}
          aria-label={text.publicLinkLabel}
          onFocus={event => event.currentTarget.select()}
          className={`${inputClass} flex-1 min-w-[16rem] font-mono text-sm`}
        />
        <button type="button" className={secondaryButtonClass} onClick={() => void handleCopy()}>
          {text.copyLink}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${secondaryButtonClass} inline-flex items-center`}
        >
          {text.openLink}
        </a>
      </div>
      <span className="text-xs text-typography-700">{text.publicLinkNote}</span>
    </div>
  );
};
