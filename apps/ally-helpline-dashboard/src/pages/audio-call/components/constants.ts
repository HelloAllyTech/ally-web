import { InDoubt, NoNetwork } from "@assets";
import { SocketDisconnectionReasons } from "@constants";

export const socketDisconnectionReasonContentMap = {
  [SocketDisconnectionReasons.NO_NETWORK]: {
    icon: NoNetwork,
    titleKey: "audioCall.error.noNetwork",
    descriptionKey: "audioCall.error.noNetworkDesc",
  },
  [SocketDisconnectionReasons.NO_NETWORK_IN_SHARED_SESSION]: {
    icon: NoNetwork,
    titleKey: "audioCall.error.noNetwork",
    descriptionKey: "audioCall.error.noNetworkSharedDesc",
  },
  [SocketDisconnectionReasons.SOMETHING_WENT_WRONG]: {
    icon: InDoubt,
    titleKey: "audioCall.error.somethingWrong",
    descriptionKey: "audioCall.error.somethingWrongDesc",
  },
};

export const NetworkIssuesList = [
  "io client disconnect",
  "io server disconnect",
  "transport close",
  "ping timeout",
  "transport error",
];
