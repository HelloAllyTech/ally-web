import React from "react";
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
  return (
    <div className={`border-b border-border-light ${className ?? ""}`} data-testid="tabs">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {items?.map(item => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
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
