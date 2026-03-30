import { AudioUploadErrorMessagesMap } from "@constants";

export const getErrorToastMessageForFileUpload = (errorCode: string) => {
  if (errorCode && AudioUploadErrorMessagesMap[errorCode])
    return AudioUploadErrorMessagesMap[errorCode];
  else return "Something Went Wrong!";
};
