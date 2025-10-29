import React, { useState } from "react";

export interface CustomImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackClassName?: string;
  fallbackText?: string;
  containerClassName?: string;
}

export const CustomImage: React.FC<CustomImageProps> = ({
  src,
  alt,
  className = "",
  fallbackClassName = "w-full h-full flex items-center justify-center text-gray-400 bg-gray-100",
  fallbackText = "Image not available",
  containerClassName = "",
  loading = "lazy",
  ...props
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`${containerClassName} w-full h-full`}>
      {!imageError && src?.length > 0 ? (
        <img
          src={src}
          alt={alt}
          className={className}
          loading={loading}
          onError={() => setImageError(true)}
          {...props}
        />
      ) : (
        <div className={fallbackClassName}>
          <span className="text-sm text-center">{fallbackText}</span>
        </div>
      )}
    </div>
  );
};
