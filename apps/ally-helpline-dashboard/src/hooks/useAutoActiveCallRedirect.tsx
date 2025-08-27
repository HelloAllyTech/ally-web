import { useNavigate, useLocation } from "react-router-dom";

import { ROUTES, SocketConnectionTypes } from "@constants";

import { useSessionManager } from ".";

export const useAutoActiveCallRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { activeSession, disconnect } = useSessionManager({
    autoConnect: true,
    connectionType: SocketConnectionTypes.CLOUD_TELEPHONY_CHAT,
  });

  const navigateToSession = () => {
    switch (activeSession?.type) {
      case SocketConnectionTypes.CLOUD_TELEPHONY_CHAT:
        navigate(`${ROUTES.AUDIO_CALL}?mode=cloud-telephony`);
        disconnect();
        break;
      default:
        break;
    }
  };

  if (activeSession && !location.pathname.includes(ROUTES.AUDIO_CALL)) {
    navigateToSession();
  }
};
