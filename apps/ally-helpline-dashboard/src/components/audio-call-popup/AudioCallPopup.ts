import { useNavigate, useLocation } from "react-router-dom";

import { ROUTES, SocketConnectionTypes } from "@constants";
import { useSessionManager } from "@hooks";

// TODO: wILL MOVE FROM COMPONENTS TO HOOKS
const AudioCallPopup = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { activeSession, disconnect } = useSessionManager({
    autoConnect: true,
    connectionType: SocketConnectionTypes.CLOUD_TELEPHONY_CHAT,
  });

  const navigateToSession = () => {
    switch (activeSession?.type) {
      case SocketConnectionTypes.CLOUD_TELEPHONY_CHAT:
        navigate(`${ROUTES.AUDIO_CALL}?mode=exotel`);
        disconnect();
        break;
      default:
        break;
    }
  };
  // TODO: Design in a way that user should be redirected to the active call

  if (activeSession && !location.pathname.includes(ROUTES.AUDIO_CALL)) {
    navigateToSession();
  }
};

export default AudioCallPopup;
