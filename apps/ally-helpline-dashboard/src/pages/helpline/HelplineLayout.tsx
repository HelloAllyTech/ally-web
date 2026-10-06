import { FC } from "react";

import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { useGetHelplineMeQuery } from "@api/helpline";
import { useCanUseTextHelpline } from "@hooks/useCanUseTextHelpline";
import { parseHelplineError } from "@utils/helplineErrors";

import { HelplineSubNav } from "./components/HelplineSubNav";
import { HelplineRealtimeProvider } from "./realtime/HelplineRealtimeProvider";
// Not from @pages: the barrel re-exports this page, so importing it here would be a cycle.
import { AccessDenied } from "../access-denied/AccessDenied";

const CenteredMessage: FC<{ title?: string; body: string; action?: React.ReactNode }> = ({
  title,
  body,
  action,
}) => (
  <div className="flex h-full items-center justify-center p-6" role="status">
    <div className="max-w-md text-center font-primary">
      {title && <h1 className="text-xl font-medium text-typography-900">{title}</h1>}
      <p className="mt-2 text-base text-typography-800">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  </div>
);

/**
 * The gate and the shell for every /helpline route. The nav tab already hides
 * the workspace without a helpline permission AND the org toggle; this repeats
 * the check so a typed URL can't reach it, and treats the server's 403
 * `HELPLINE_DISABLED` the same way (the server is the real gate).
 */
export const HelplineLayout: FC = () => {
  const { t } = useTranslation();
  const { canView, hasPermission, isLoading } = useCanUseTextHelpline();
  const {
    data: me,
    error,
    isLoading: isMeLoading,
    refetch,
  } = useGetHelplineMeQuery(undefined, { skip: !canView });

  if (!hasPermission) return <AccessDenied />;
  if (isLoading || (canView && isMeLoading)) {
    return <CenteredMessage body={t("helplineWorkspace.gate.loading")} />;
  }

  const disabledByServer = parseHelplineError(error).errorCode === "HELPLINE_DISABLED";
  if (!canView || disabledByServer) {
    return (
      <CenteredMessage
        title={t("helplineWorkspace.gate.disabledTitle")}
        body={t("helplineWorkspace.gate.disabledBody")}
      />
    );
  }
  if (!me) {
    return (
      <CenteredMessage
        body={t("helplineWorkspace.gate.loadFailed")}
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-[40px] rounded-full border border-border-medium px-4 font-primary text-sm text-typography-900 hover:bg-background-secondary"
          >
            {t("helplineWorkspace.gate.retry")}
          </button>
        }
      />
    );
  }

  return (
    <HelplineRealtimeProvider enabled>
      <div className="flex h-full min-h-0 flex-col bg-white" data-testid="helpline-workspace">
        <HelplineSubNav />
        <div className="min-h-0 flex-1">
          {/* Pages read the listener's profile from the same (cached) GET /me query. */}
          <Outlet />
        </div>
      </div>
    </HelplineRealtimeProvider>
  );
};

export default HelplineLayout;
