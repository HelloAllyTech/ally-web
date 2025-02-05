import React from "react";
import { Search } from "lucide-react";
import UserMenu from "./user-menu";

interface PageHeaderProps {
  title: string;
  showSearch?: boolean;
  rightContent?: React.ReactNode;
  onLogout?: () => void;
}

const PageHeader = ({
  title,
  showSearch = true,
  rightContent,
  onLogout,
}: PageHeaderProps) => {
  return (
    <div className="bg-gray-800 px-[32px] py-3 top-0 sticky">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-medium text-white">{title}</h1>
        {showSearch && (
          <div className="relative max-w-md w-full mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-1.5 bg-gray-700 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
        <div className="flex items-center space-x-4">
          {rightContent}
          {onLogout && <UserMenu onLogout={onLogout} />}
        </div>
        {!rightContent && !onLogout && <div className="w-[200px]" />}{" "}
        {/* Spacer for centering when no right content */}
      </div>
    </div>
  );
};

export default PageHeader;
