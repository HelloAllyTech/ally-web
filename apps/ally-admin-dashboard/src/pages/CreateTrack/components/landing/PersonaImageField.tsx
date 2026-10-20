import { FC, useRef } from "react";

import { toast } from "sonner";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { Trash } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LANDING_LIMITS } from "@types";

import { labelClass } from "./LandingFields";
import { useTrackMediaUpload } from "../../useTrackMediaUpload";

interface PersonaImageFieldProps {
  imageUrl: string | null;
  onChange: (imageUrl: string | null) => void;
}

/** Persona image: the course cover's two-step upload (`useTrackMediaUpload`), at avatar size. */
export const PersonaImageField: FC<PersonaImageFieldProps> = ({ imageUrl, onChange }) => {
  const copy = en.courseLanding.hero.personaImage;
  const { upload, isUploading } = useTrackMediaUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(copy.notAnImage);
      return;
    }
    const publicUrl = await upload(file, "image");
    if (publicUrl && publicUrl.length <= LANDING_LIMITS.personaImageUrlMax) onChange(publicUrl);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>{copy.label}</span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={copy.label}
        onChange={event => void handleFile(event)}
      />
      {imageUrl ? (
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
            <CustomImage src={imageUrl} alt={copy.alt} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant={ButtonVariant.SECONDARY}
              className="!h-9 text-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? copy.uploading : copy.replace}
            </Button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 text-xs text-destructive-500 hover:text-destructive-600"
            >
              <Trash className="w-3.5 h-3.5" />
              {copy.remove}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full border border-dashed border-border-dark rounded-md py-6 text-sm text-typography-600 hover:bg-secondary-50 disabled:opacity-50"
        >
          {isUploading ? copy.uploading : copy.upload}
        </button>
      )}
    </div>
  );
};
