import React from "react";

import { Navigate, useNavigate } from "react-router-dom";

import { clearEvaluatorSession, evaluatorAPI } from "@api";
import { en, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { store } from "@store";

/**
 * Chrome + client-side auth gate for the evaluator micro-app (/evaluate).
 * Evaluators are NOT admin users: their session is a separate token in
 * localStorage, so this renders without the admin sidebar and never touches
 * the admin auth state.
 */
export const EvaluateLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem(LOCAL_STORAGE_KEYS.EVALUATOR_ACCESS_TOKEN);
  const email = localStorage.getItem(LOCAL_STORAGE_KEYS.EVALUATOR_EMAIL);

  if (!token) {
    return <Navigate to={ROUTES.EVALUATE} replace />;
  }

  const handleSignOut = () => {
    clearEvaluatorSession();
    // Drop this evaluator's cached assignments so the next evaluator to sign in
    // on the same browser can never see them.
    store.dispatch(evaluatorAPI.util.resetApiState());
    navigate(ROUTES.EVALUATE, { replace: true });
  };

  return (
    <div className="min-h-dvh bg-background font-primary">
      <header className="border-b border-border-light bg-white">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-4 flex flex-wrap gap-x-4 gap-y-1 items-center justify-between">
          <span className="text-xl font-secondary text-typography-900">{en.evaluate.title}</span>
          <div className="flex items-center gap-4 text-sm min-w-0">
            <span className="text-typography-600 min-w-0 truncate">{email}</span>
            <button
              onClick={handleSignOut}
              className="text-primary-600 hover:underline shrink-0 max-md:min-h-10"
            >
              {en.evaluate.signOut}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
    </div>
  );
};
