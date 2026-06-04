import { FC, ReactNode } from "react";

export interface LanguageTab {
  id: string;
  label: string;
}

interface LanguageTabPanelProps {
  tabs: LanguageTab[];
  activeTabId: string | null;
  onTabChange: (id: string) => void;
  children: ReactNode;
}

export const LanguageTabPanel: FC<LanguageTabPanelProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  children,
}) => (
  <div className="border border-border-light rounded-md overflow-hidden bg-white">
    {tabs.length > 1 && (
      <div className="flex border-b border-border-light overflow-x-auto" role="tablist">
        {tabs.map(tab => {
          const isActive = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "text-primary-500 border-b-2 border-primary-500 bg-primary-50/30"
                  : "text-typography-600 hover:text-typography-800 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    )}
    {children}
  </div>
);
