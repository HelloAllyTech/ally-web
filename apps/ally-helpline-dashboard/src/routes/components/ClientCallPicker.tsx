import { FC, useEffect, useState } from "react";

import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useAcceptCallMutation, useGetChatTypesQuery, useGetWaitingClientsQuery } from "@api";
import { CallPicker } from "@components";
import { CallType, excludeCallPicker, ROUTES } from "@constants";
import { useUser } from "@hooks";
import { RootState } from "@store";
import { UserStatus, WaitingClient } from "@types";
import { isCounselor, isPathExcluded, isUserAvailable } from "@utils";

const ClientCallPicker: FC = () => {
  const { user, updateUserStatus } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [showAlertCall, setShowAlertCall] = useState<boolean>(true);
  const [waitingClients, setWaitingClients] = useState<WaitingClient[]>([]);

  const { userStatus } = useSelector((state: RootState) => state.user);

  const { data: chatTypes } = useGetChatTypesQuery();
  const [acceptCall] = useAcceptCallMutation();
  const { data: getWaitingClientsData, isSuccess: isWaitingClientsSuccess } =
    useGetWaitingClientsQuery(undefined, {
      skip:
        isCounselor(user?.role) ||
        !isUserAvailable(userStatus) ||
        !chatTypes?.includes(CallType.WEBRTC_CHAT),
      pollingInterval: 5000,
    });

  useEffect(() => {
    if (isWaitingClientsSuccess) {
      setWaitingClients(getWaitingClientsData?.clients || []);
    }
  }, [isWaitingClientsSuccess, getWaitingClientsData]);

  const onAcceptCall = async () => {
    try {
      await acceptCall({ chatId: waitingClients[0]?.chat?.chatId });
      updateUserStatus(UserStatus.OFFLINE);

      // Clearing waitingClients to prevent call pop-up after the call due to outdated waitingClients
      setWaitingClients([]);
      navigate(ROUTES.AUDIO_CALL);
    } catch (error) {
      toast.error(error?.response?.data?.detail ?? "Something went wrong. Please try again later!");
      logger.info(`Error accepting chat: ${error}`);
    }
  };

  if (
    !showAlertCall ||
    !waitingClients.length ||
    (!isUserAvailable(userStatus) && isPathExcluded(pathname, excludeCallPicker))
  )
    return null;

  return <CallPicker onAccept={onAcceptCall} onDecline={() => setShowAlertCall(false)} />;
};

export default ClientCallPicker;
