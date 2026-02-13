import { FC, useState, useCallback, useMemo, useEffect, useRef } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared/index";
import { useGetImageLibraryQuery } from "@api";
import { CheckCircle } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { CoverImageLibraryItem } from "@types";

interface ImageLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}
interface ContentProps {
  isLoadingState: boolean;
  isEmpty: boolean;
  images: CoverImageLibraryItem[];
  selectedImage: string;
  onImageClick: (imageUrl: string) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  hasMore: boolean;
}
interface ImageGridProps {
  images: CoverImageLibraryItem[];
  selectedImage: string;
  onImageClick: (imageUrl: string) => void;
}
interface ImageCardProps {
  image: CoverImageLibraryItem;
  isSelected: boolean;
  onClick: (imageUrl: string) => void;
}
interface FooterProps {
  onClose: () => void;
  onSelect: () => void;
  isDisabled: boolean;
}

const IMAGE_LIBRARY_LIMIT = 30;
const SKELETON_COUNT = 15;
const GRID_COLS = 3;

const Header: FC = () => (
  <div className="flex items-center justify-between px-4 py-3">
    <h2 className="text-lg font-semibold text-typography-900">{en.simulation.imageLibrary}</h2>
  </div>
);

const Content: FC<ContentProps> = ({
  isLoadingState,
  isEmpty,
  images,
  selectedImage,
  onImageClick,
  onScroll,
  scrollContainerRef,
}) => (
  <div
    ref={scrollContainerRef}
    className="flex-1 overflow-y-auto px-4 custom-scrollbar"
    onScroll={onScroll}
  >
    {isLoadingState && images.length === 0 ? (
      <LoadingState />
    ) : isEmpty ? (
      <EmptyState />
    ) : (
      <>
        <ImageGrid images={images} selectedImage={selectedImage} onImageClick={onImageClick} />
        {isLoadingState && images.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="text-typography-600 text-sm">{en.common.loading}</div>
          </div>
        )}
      </>
    )}
  </div>
);

const LoadingState: FC = () => (
  <div className={`grid grid-cols-${GRID_COLS} gap-5`}>
    {[...Array(SKELETON_COUNT)].map((_, index) => (
      <div
        key={`skeleton-${index}`}
        className="aspect-video rounded-md bg-gray-200 animate-pulse"
      />
    ))}
  </div>
);

const EmptyState: FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12">
    <div className="text-typography-600 text-base mb-2">{en.simulation.noImagesAvailable}</div>
    <div className="text-typography-500 text-sm">{en.simulation.imageLibraryEmpty}</div>
  </div>
);

const ImageGrid: FC<ImageGridProps> = ({ images, selectedImage, onImageClick }) => {
  const validImages = useMemo(() => images.filter(img => img.imageUrl), [images]);

  return (
    <div className={`grid grid-cols-${GRID_COLS} gap-5`}>
      {validImages.map((img, index) => (
        <ImageCard
          key={`${img.id}-${index}`}
          image={img}
          isSelected={selectedImage === img.imageUrl}
          onClick={onImageClick}
        />
      ))}
    </div>
  );
};

const ImageCard: FC<ImageCardProps> = ({ image, isSelected, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(image.imageUrl)}
    className="flex items-center justify-center rounded-md overflow-hidden relative hover:opacity-90 transition-opacity"
  >
    <div
      className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
        isSelected ? "opacity-100" : "opacity-0"
      }`}
    >
      <CheckCircle />
    </div>
    <CustomImage
      src={image.imageUrl}
      alt="Library image"
      className="w-full h-full object-cover aspect-video"
    />
  </button>
);

const Footer: FC<FooterProps> = ({ onClose, onSelect, isDisabled }) => (
  <div className="flex items-center justify-end gap-2 p-4 border-t border-border-light mx-5">
    <Button
      variant={ButtonVariant.SECONDARY}
      onClick={onClose}
      className="!text-base !text-primary !font-semibold"
    >
      {en.simulation.cancel}
    </Button>
    <Button
      variant={ButtonVariant.PRIMARY}
      onClick={onSelect}
      className="!text-base !text-white"
      disabled={isDisabled}
    >
      {en.simulation.selectImage}
    </Button>
  </div>
);

export const ImageLibrary: FC<ImageLibraryProps> = ({ isOpen, onClose, onSelect }) => {
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [allImages, setAllImages] = useState<CoverImageLibraryItem[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useGetImageLibraryQuery(
    { limit: IMAGE_LIBRARY_LIMIT, offset },
    { skip: !isOpen },
  );

  const totalCount = data?.count || 0;
  const hasMore = allImages.length < totalCount;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOffset(0);
      setAllImages([]);
      setSelectedImage("");
    }
  }, [isOpen]);

  // Append new images and prevent duplicates
  useEffect(() => {
    if (data?.coverImages) {
      setAllImages(prev => {
        if (offset === 0) return data.coverImages;
        const existingIds = new Set(prev.map(img => img.id));
        const newImages = data.coverImages.filter(img => !existingIds.has(img.id));
        return [...prev, ...newImages];
      });
    }
  }, [data, offset]);

  const isLoadingState = isLoading || isFetching;
  const isEmpty = !isLoadingState && allImages.length === 0;

  const handleLoadMore = useCallback(() => {
    if (!isLoadingState && hasMore) {
      setOffset(prev => prev + IMAGE_LIBRARY_LIMIT);
    }
  }, [isLoadingState, hasMore]);

  const handleImageSelect = useCallback(() => {
    if (selectedImage) {
      onSelect(selectedImage);
      onClose();
      setSelectedImage("");
    }
  }, [selectedImage, onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSelectedImage("");
    onClose();
  }, [onClose]);

  const handleImageClick = useCallback((imageUrl: string) => {
    setSelectedImage(imageUrl);
  }, []);

  // Infinite scroll handler
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const scrollThreshold = 200; // Load more when 200px from bottom

      if (target.scrollHeight - target.scrollTop - target.clientHeight < scrollThreshold) {
        handleLoadMore();
      }
    },
    [handleLoadMore],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleClose} />
      <div
        className="relative bg-white rounded-lg shadow-xl flex flex-col w-[30%] h-[60%]"
        onClick={e => e.stopPropagation()}
      >
        <Header />
        <Content
          isLoadingState={isLoadingState}
          isEmpty={isEmpty}
          images={allImages}
          selectedImage={selectedImage}
          onImageClick={handleImageClick}
          onScroll={handleScroll}
          scrollContainerRef={scrollContainerRef}
          hasMore={hasMore}
        />
        <Footer
          onClose={handleClose}
          onSelect={handleImageSelect}
          isDisabled={!selectedImage || isLoadingState}
        />
      </div>
    </div>
  );
};
