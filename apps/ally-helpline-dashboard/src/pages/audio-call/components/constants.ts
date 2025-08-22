import { InDoubt, NoNetwork } from "@assets";
import { SocketDisconnectionReasons } from "@constants";

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

export const NetworkIssuesList = [
  "io client disconnect",
  "io server disconnect",
  "transport close",
  "ping timeout",
  "transport error",
];
