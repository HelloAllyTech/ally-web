import { useEffect } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ROUTES } from "@src/constants";

export const ImpersonateHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const impersonatedByaccessToken = params.get("impersonatedByAccessToken");
    if (accessToken && refreshToken && impersonatedByaccessToken) {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("isImpersonating", "true");
      localStorage.setItem("impersonationStartTime", Date.now().toString());
      localStorage.setItem("impersonatedByAccessToken", impersonatedByaccessToken);

      const url = new URL(window.location.href);
      url.searchParams.delete("accessToken");
      url.searchParams.delete("refreshToken");
      url.searchParams.delete("impersonatedByAccessToken");
      window.history.replaceState({}, "", url.toString());
      toast.success("Impersonation began successfully at " + new Date().toLocaleTimeString());
    } else {
      toast.error("Invalid data for impersonation");
    }
    navigate(ROUTES.LOGIN);
  }, []);

  return null;
};
