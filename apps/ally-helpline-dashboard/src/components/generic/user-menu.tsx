import { useState } from "react";
import { useSelector } from "react-redux";
import { LogOut, Settings, User } from "lucide-react";

import { RootState } from "@/store/store";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "./button";

interface UserMenuProps {
  onLogout: () => void;
}

const UserMenu = ({ onLogout }: UserMenuProps) => {
  const user = useSelector((state: RootState) => state.user.user);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`p-3 outline-none rounded-lg text-gray-400 transition-colors ${
            isOpen ? "bg-gray-700 text-white" : "hover:text-white hover:bg-gray-700"
          }`}
        >
          <Settings className="text-white w-6 h-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="cursor-default flex text-sm items-center p-3 gap-2" disabled>
          <div className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="h-4 w-4 text-gray-400" />
          </div>
          <span className="font-medium">{user?.name}</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="p-3 cursor-pointer" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
