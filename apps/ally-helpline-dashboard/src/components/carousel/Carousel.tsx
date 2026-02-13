// File: apps/ally-helpline-dashboard/src/components/carousel/Carousel.tsx
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AnimatePresence, motion } from "framer-motion";

import { getKeyFromIndex } from "@utils";

import { CarouselProps, CarouselSize, CarouselVariant } from "./types";

const DEFAULT_INTERVAL_SECONDS = 4;
const SLIDE_ANIMATION_OFFSET = 40;
const TRANSITION_DURATION = 0.45;

/**
 * Lightweight Carousel for the dashboard.
 * - Auto-advances on an interval (0 = no auto-advance)
 * - Pauses on hover
 * - Displays an image and a text caption
 * - Slider to navigate between slides
 */
const Carousel: FC<CarouselProps> = ({
  slides,
  intervalSeconds = DEFAULT_INTERVAL_SECONDS,
  pauseOnHover = true,
  className = "",
  textClassName = "",
  imageClassName = "",
  variant = CarouselVariant.LIGHT,
  size = CarouselSize.LARGE,
}) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const prevIndexRef = useRef<number>(0);

  const slidesCount = slides?.length ?? 0;
  const hasSlides = slidesCount > 0;
  const activeSlide = slides[activeIndex];

  useEffect(() => {
    // If paused or no slides, ensure any existing timer is cleared
    if (!hasSlides || isPaused || intervalSeconds <= 0) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return undefined;
    }

    timerRef.current = window.setInterval(() => {
      setActiveIndex(prev => {
        prevIndexRef.current = prev;
        return (prev + 1) % slidesCount;
      });
    }, intervalSeconds * 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [intervalSeconds, isPaused, slidesCount, hasSlides]);

  const handleMouseEnter = () => {
    if (!pauseOnHover) return;
    setIsPaused(true);
  };
  const handleMouseLeave = () => {
    if (!pauseOnHover) return;
    setIsPaused(false);
  };

  const onSelectSlide = (index: number) => {
    if (index < 0 || index >= slidesCount) return;
    prevIndexRef.current = activeIndex;
    setActiveIndex(index);
  };

  const getContainerStyles = () => {
    switch (variant) {
      case CarouselVariant.LIGHT:
        return "bg-white";
      case CarouselVariant.DARK:
        return "!bg-[#F3F3F3] border-[0.5px] border-[#D3D3D3] !p-2";
    }
  };

  const getTextStyles = () => {
    let styles = "";
    switch (variant) {
      case CarouselVariant.LIGHT:
        styles = "text-white";
        break;
      case CarouselVariant.DARK:
        styles = "text-typography-900";
        break;
    }
    switch (size) {
      case CarouselSize.SMALL:
        styles += " text-lg px-4";
        break;
      case CarouselSize.LARGE:
        styles += " text-2xl";
    }
    return styles;
  };

  const getSliderStyles = (isActive: boolean) => {
    switch (variant) {
      case CarouselVariant.LIGHT:
        return isActive ? "bg-black" : "bg-[#D2D2D2] hover:bg-slate-400";
      case CarouselVariant.DARK:
        return isActive ? "bg-black" : "bg-[#D2D2D2] hover:bg-slate-400";
    }
  };

  if (!hasSlides) return null;

  return (
    <div
      className={`flex flex-col items-center justify-between p-4 select-none rounded-md backdrop-blur-sm
        ${getContainerStyles()} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-roledescription="carousel"
      data-testid="carousel-container"
      role="group"
      aria-label="carousel"
    >
      <div className="overflow-hidden rounded-lg" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={getKeyFromIndex(activeIndex, "slide")}
            initial={{ opacity: 0, x: -SLIDE_ANIMATION_OFFSET }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: SLIDE_ANIMATION_OFFSET }}
            transition={{ duration: TRANSITION_DURATION, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            <div
              className={`w-full flex items-center justify-center overflow-hidden rounded-lg ${imageClassName}`}
            >
              <activeSlide.imageSrc className={`w-full h-full object-cover`} />
            </div>
            <div className="text-center min-h-20 flex items-center justify-center">
              <p className={`font-primary leading-tight ${getTextStyles()} ${textClassName}`}>
                {t(activeSlide.textKey)}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-2">
        {slides.map((_, slideIndex) => {
          const isActive = slideIndex === activeIndex;
          return (
            <div
              data-testid={`indicator-${slideIndex}`}
              aria-label={`Go to slide ${slideIndex + 1}`}
              aria-current={isActive}
              key={getKeyFromIndex(slideIndex, "slide-indicator")}
              className="w-4 p-2 cursor-pointer"
              onClick={() => onSelectSlide(slideIndex)}
            >
              <div className={`h-[2.5px] w-[8px] transition-colors ${getSliderStyles(isActive)}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Carousel;
