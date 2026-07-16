import React, { useCallback, useState } from "react";

import { Navigate, useNavigate } from "react-router-dom";

import { evaluatorAPI, useEvaluatorLoginMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { store } from "@store";

/**
 * Email + password sign-in for human evaluators (credentials are created and
 * shared offline by a super-duper-admin in AI Lab → Evaluators).
 */
export const EvaluateLogin: React.FC = () => {
  const navigate = useNavigate();
  const [login, { isLoading }] = useEvaluatorLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!canSubmit) return;
      setError("");
      try {
        const result = await login({ email: email.trim(), password }).unwrap();
        // Clear any cached data from a previous evaluator session on this
        // browser before storing the new token.
        store.dispatch(evaluatorAPI.util.resetApiState());
        localStorage.setItem(LOCAL_STORAGE_KEYS.EVALUATOR_ACCESS_TOKEN, result.accessToken);
        localStorage.setItem(LOCAL_STORAGE_KEYS.EVALUATOR_EMAIL, result.evaluator.email);
        navigate(ROUTES.EVALUATE_RECORDS, { replace: true });
      } catch {
        setError(en.evaluate.loginFailed);
      }
    },
    [canSubmit, email, password, login, navigate],
  );

  // Already signed in → straight to the records list. (After all hooks so the
  // hook order never changes between renders.)
  if (localStorage.getItem(LOCAL_STORAGE_KEYS.EVALUATOR_ACCESS_TOKEN)) {
    return <Navigate to={ROUTES.EVALUATE_RECORDS} replace />;
  }

  return (
    <div className="min-h-screen bg-background font-primary flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-secondary text-typography-900">{en.evaluate.title}</h1>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-border-light rounded-md p-8 space-y-5"
        >
          <div>
            <h2 className="text-xl text-typography-900">{en.evaluate.loginHeading}</h2>
            <p className="text-sm text-typography-600 mt-1">{en.evaluate.loginSubtitle}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-typography-900">{en.evaluate.emailLabel}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-typography-900">{en.evaluate.passwordLabel}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base"
            />
          </div>
          {error && <p className="text-sm text-destructive-600">{error}</p>}
          <Button variant={ButtonVariant.PRIMARY} type="submit" disabled={!canSubmit} fullWidth>
            {isLoading ? en.evaluate.signingIn : en.evaluate.signIn}
          </Button>
        </form>
      </div>
    </div>
  );
};
