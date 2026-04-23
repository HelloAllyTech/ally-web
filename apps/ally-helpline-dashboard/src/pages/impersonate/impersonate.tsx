import { useEffect } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useExchangeImpersonateCodeMutation } from "@api";
import { ROUTES } from "@constants";

export const ImpersonateHandler = () => {
  const navigate = useNavigate();
  const [exchangeCode] = useExchangeImpersonateCodeMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get("code");
    if (authCode) {
      const handleImpersonation = async () => {
        try {
          const response = await exchangeCode({ authCode }).unwrap();
          if (response?.accessToken && response?.refreshToken) {
            localStorage.setItem("accessToken", response.accessToken);
            localStorage.setItem("refreshToken", response.refreshToken);
            localStorage.setItem("adminUserId", response.user.id.toString());
            localStorage.setItem("isImpersonating", "true");
            localStorage.setItem("impersonationStartTime", Date.now().toString());

            const url = new URL(window.location.href);
            url.searchParams.delete("code");
            window.history.replaceState({}, "", url.toString());

            toast.success("Impersonation began successfully at " + new Date().toLocaleTimeString());
            navigate(ROUTES.HOME);
          } else {
            toast.error("Invalid data for impersonation");
            navigate(ROUTES.LOGIN);
          }
        } catch {
          toast.error("Failed to begin impersonation");
          navigate(ROUTES.LOGIN);
        }
      };

      handleImpersonation();
    } else {
      toast.error("Invalid verification code");
      navigate(ROUTES.LOGIN);
    }
  }, [exchangeCode, navigate]);

  return null;
};
