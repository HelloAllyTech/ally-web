import { FC } from "react";

import { TabButtonProps } from "./types";

const TabButton: FC<TabButtonProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`pb-3 px-1 text-base font-medium transition-colors relative ${
      isActive ? "text-primary-500" : "text-gray-500 hover:text-gray-700"
    }`}
  >
    {label}
    {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />}
  </button>
);

export default TabButton;
