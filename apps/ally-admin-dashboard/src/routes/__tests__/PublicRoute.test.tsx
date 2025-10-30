import React from "react";

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";

import { LOCAL_STORAGE_KEYS, ROUTES } from "@constants";

import { PublicRoute } from "../PublicRoute";

describe("PublicRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders children when not authenticated", () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "false");

    render(
      <MemoryRouter initialEntries={[ROUTES.LOGIN]}>
        <Routes>
          <Route
            path={ROUTES.LOGIN}
            element={
              <PublicRoute>
                <div>LoginForm</div>
              </PublicRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("LoginForm")).toBeInTheDocument();
  });

  it("redirects to simulation studio when authenticated", () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");

    render(
      <MemoryRouter initialEntries={[ROUTES.LOGIN]}>
        <Routes>
          <Route path={ROUTES.SIMULATION_STUDIO} element={<div>Studio</div>} />
          <Route
            path={ROUTES.LOGIN}
            element={
              <PublicRoute>
                <div>LoginForm</div>
              </PublicRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.queryByText("LoginForm")).not.toBeInTheDocument();
  });
});
