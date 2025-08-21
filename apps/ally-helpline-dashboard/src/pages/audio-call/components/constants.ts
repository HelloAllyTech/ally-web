import { InDoubt, NoNetwork } from "@/assets/icons";
import { SocketDisconnectionReasons } from "@/constants/socket";

export const socketDisconnectionReasonContentMap = {
  [SocketDisconnectionReasons.NO_NETWORK]: {
    icon: NoNetwork,
    title: "No internet connection",
    description:
      "Call ended due to network interruption, please check your connection and try again.",
  },
  [SocketDisconnectionReasons.SOMETHING_WENT_WRONG]: {
    icon: InDoubt,
    title: "Something went wrong",
    description: "Call ended due to unknown reason, please try again..",
  },
};
