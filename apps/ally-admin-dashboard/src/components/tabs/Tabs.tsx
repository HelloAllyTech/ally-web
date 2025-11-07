import React from "react";

import { TabsProps } from "@components/types";

export const Tabs: React.FC<TabsProps> = ({ items, activeId, onChange, className }) => {
  return (
    <div className={`border-b border-border-light ${className ?? ""}`}>
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {items?.map(item => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative font-normal whitespace-nowrap py-3 px-3 text-base min-w-[90px] leading-6 ${
                isActive ? "text-primary-500" : "text-text-700 hover:text-text-900"
              }`}
            >
              {item.label} {item.count || "0"}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute bottom-[0px] left-1/2 -translate-x-1/2 h-[3px] w-full rounded-tl-lg rounded-tr-lg bg-primary"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
