import { CallProvider, CloudTelephonyList } from "@constants";

export const isProviderCloudTelephony = (provider: CallProvider) => {
  return CloudTelephonyList.includes(provider);
};
