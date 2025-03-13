import * as Tooltip from "@radix-ui/react-tooltip";
import { useSelector } from "react-redux";

import { UserRole } from "@/types/user";
import { RootState } from "@/store/store";
import { ROUTES } from "@/constants/routes";
import { TabId, TabLabel } from "@/constants/tabs";
import { CallLogIcon, HomeIcon, LiveCallIcon } from "@/assets/icons";

interface NavSideBarProps {
  activeTab: TabId;
  onTabChange: (tab: string) => void;
}

const NavSideBar = ({ activeTab, onTabChange }: NavSideBarProps) => {
  const user = useSelector((state: RootState) => state.user.user);
  const isClient = user?.role === UserRole.CLIENT;

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="w-16 bg-gray-900 flex flex-col items-center py-4 fixed h-screen">
        <div className="flex-1 flex flex-col items-center gap-8">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={() => onTabChange(ROUTES.HOME)}
                className={`p-3 place-items-center rounded-lg ${
                  activeTab === TabId.HOME
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <HomeIcon className="path path-stroke-current" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm"
                side="right"
              >
                {TabLabel[TabId.HOME]}
                <Tooltip.Arrow className="fill-gray-800" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          {!isClient && (
            <>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={() => onTabChange(ROUTES.LIVE_CALL)}
                    className={`p-3 place-items-center rounded-lg ${
                      activeTab === TabId.LIVE_CALL
                        ? "text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <LiveCallIcon className="path path-fill-current" />
                    <p className="text-[10px] mt-1">
                      {TabLabel[TabId.LIVE_CALL]}
                    </p>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm"
                    side="right"
                  >
                    Live Call Monitor
                    <Tooltip.Arrow className="fill-gray-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={() => onTabChange(ROUTES.CALL_LOGS)}
                    className={`p-3 place-items-center rounded-lg ${
                      activeTab === TabId.CALL_LOGS
                        ? "text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <CallLogIcon className="path path-fill-current" />
                    <p className="text-[10px] mt-1">
                      {TabLabel[TabId.CALL_LOGS]}
                    </p>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm"
                    side="right"
                  >
                    {TabLabel[TabId.CALL_LOGS]}
                    <Tooltip.Arrow className="fill-gray-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  );
};

export default NavSideBar;
