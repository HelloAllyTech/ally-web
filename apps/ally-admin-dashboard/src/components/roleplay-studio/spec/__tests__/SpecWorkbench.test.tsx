import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import roleplaySpecSlice, { setStreaming } from "@reducer/roleplaySpecReducer";

// Capture the readOnly prop each child receives instead of rendering the heavy
// section editors / React-Flow canvas.
const specPanelReadOnly: boolean[] = [];
const stateMachineReadOnly: boolean[] = [];

vi.mock("../SpecPanel", () => ({
  SpecPanel: ({ readOnly }: { readOnly?: boolean }) => {
    specPanelReadOnly.push(!!readOnly);
    return <div data-testid="spec-panel">{String(readOnly)}</div>;
  },
}));

vi.mock("../../state-machine", () => ({
  StateMachineEditor: ({ readOnly }: { readOnly?: boolean }) => {
    stateMachineReadOnly.push(!!readOnly);
    return <div data-testid="state-machine">{String(readOnly)}</div>;
  },
}));

import { SpecWorkbench } from "../SpecWorkbench";

const makeStore = () =>
  configureStore({
    reducer: { roleplaySpec: roleplaySpecSlice.reducer },
  });

const renderWorkbench = (store = makeStore()) => {
  const utils = render(
    <Provider store={store}>
      <SpecWorkbench />
    </Provider>,
  );
  return { store, ...utils };
};

describe("SpecWorkbench edit toggle (O11)", () => {
  beforeEach(() => {
    specPanelReadOnly.length = 0;
    stateMachineReadOnly.length = 0;
  });

  it("renders the spec read-only by default", () => {
    renderWorkbench();
    expect(specPanelReadOnly.at(-1)).toBe(true);
  });

  it("unlocks editing when the toggle is switched on", () => {
    renderWorkbench();
    fireEvent.click(screen.getByRole("switch"));
    expect(specPanelReadOnly.at(-1)).toBe(false);
  });

  it("force-locks editing while the copilot is streaming", () => {
    const { store } = renderWorkbench();
    fireEvent.click(screen.getByRole("switch"));
    expect(specPanelReadOnly.at(-1)).toBe(false);
    act(() => {
      store.dispatch(setStreaming(true));
    });
    expect(specPanelReadOnly.at(-1)).toBe(true);
  });
});
