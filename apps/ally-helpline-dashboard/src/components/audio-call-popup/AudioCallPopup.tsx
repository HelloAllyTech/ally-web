import { AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

import { useSessionManager } from "@/hooks";
import { SocketConnectionTypes } from "@/constants/socket";
import { ROUTES } from "@/constants/routes";

const AudioCallPopup = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { activeSession, disconnect } = useSessionManager({
    autoConnect: true,
    connectionType: SocketConnectionTypes.CLOUD_TELEPHONY_CHAT,
  });

  const navigateToSession = (session: any) => {
    switch (session.type) {
      case SocketConnectionTypes.CLOUD_TELEPHONY_CHAT:
        navigate(`${ROUTES.AUDIO_CALL}?mode=exotel`);
        disconnect();
        break;
      default:
        break;
    }
  };

  if (!activeSession || location.pathname.includes(ROUTES.AUDIO_CALL)) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <h2 className="text-lg font-bold">Active Session</h2>
          <div className="mt-[10px]">
            <p className="text-[16px] text-gray-500 mb-2">
              You have a session waiting for you. Please accept or reject the session.
            </p>
            <div className="flex gap-2 items-center">
              <div className="text-[14px] text-gray-500 font-medium">{activeSession.type}</div>
              <div
                onClick={() => navigateToSession(activeSession)}
                className="text-[12px] text-gray-500 bg-blue-500 text-white px-2 py-1 rounded-[6px] cursor-pointer"
              >
                View
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default AudioCallPopup;
