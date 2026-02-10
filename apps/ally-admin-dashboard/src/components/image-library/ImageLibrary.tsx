import { FC, useState } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared/index";
import { useGetImageLibraryQuery } from "@api";
import { CheckCircle } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
interface ImageLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}

const IMAGE_LIBRARY_LIMIT = 100;

export const ImageLibrary: FC<ImageLibraryProps> = ({ isOpen, onClose, onSelect }) => {
  const [selectedImage, setSelectedImage] = useState<string>("");
  const { data } = useGetImageLibraryQuery(
    { limit: IMAGE_LIBRARY_LIMIT, offset: 0 },
    { skip: !isOpen },
  );
  const images = Array.isArray(data) ? data : [];

  const handleImageSelect = () => {
    if (selectedImage) {
      onSelect(selectedImage);
      onClose();
    }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div
        className="relative bg-white rounded-lg shadow-xl flex flex-col w-[30%] h-[60%]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold text-typography-900">Image Library</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          <div className="grid grid-cols-3 gap-5">
            {images
              .filter(img => img.coverImageUrl)
              .map((img, index) => (
                <button
                  key={`${img.coverImageUrl}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(img.coverImageUrl)}
                  className="flex items-center justify-center rounded-md overflow-hidden relative"
                >
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200 
                    ${selectedImage === img.coverImageUrl ? "opacity-100" : "opacity-0"}`}
                  >
                    <CheckCircle />
                  </div>
                  <CustomImage
                    src={img.coverImageUrl}
                    alt="Library image"
                    className="w-full h-full object-cover aspect-video"
                  />
                </button>
              ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border-light mx-5">
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={() => onClose()}
            className="!text-base  !text-primary !font-semibold"
          >
            {en.simulation.cancel}
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={() => handleImageSelect()}
            className="!text-base !text-white"
          >
            {en.simulation.selectImage}
          </Button>
        </div>
      </div>
    </div>
  );
};
