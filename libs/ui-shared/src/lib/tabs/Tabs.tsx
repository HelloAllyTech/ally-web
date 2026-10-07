import React, { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}
export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  showCount?: boolean;
  tabStyles?: CSSProperties;
}
export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  className,
  showCount = true,
  tabStyles,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // On a phone the strip scrolls sideways, so a tab opened from a deep link
  // (e.g. ?tab=super-admins) or picked by code could start off-screen. Bring
  // the active tab into view by scrolling the strip only — never the page.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const tab = tabRefs.current[activeId];
    if (!scroller || !tab) return;
    const strip = scroller.getBoundingClientRect();
    const rect = tab.getBoundingClientRect();
    if (rect.left < strip.left || rect.right > strip.right) {
      scroller.scrollLeft += rect.left + rect.width / 2 - (strip.left + strip.width / 2);
    }
  }, [activeId]);

  return (
    <div
      ref={scrollerRef}
      className={`overflow-x-auto border-b border-border-light ${className ?? ""}`}
      data-testid="tabs"
    >
      <nav className="-mb-px flex min-w-max space-x-8" aria-label="Tabs">
        {items?.map(item => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              ref={el => {
                tabRefs.current[item.id] = el;
              }}
              data-testid={`tab-${item.id}`}
              onClick={() => onChange(item.id)}
              className={`relative font-normal whitespace-nowrap py-3 px-3 text-base min-w-[90px] leading-6 ${
                isActive ? "text-primary-500" : "text-typography-900 hover:text-typography-900"
              }`}
              style={tabStyles}
            >
              {item.label} {showCount ? item.count || "0" : ""}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute bottom-[0px] left-1/2 -translate-x-1/2 h-[3px] w-full rounded-tl-lg rounded-tr-lg bg-primary-500"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
