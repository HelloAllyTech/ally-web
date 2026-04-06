import React from "react";

import "@testing-library/jest-dom";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import InfiniteScroll from "../InfiniteScroll";

describe("InfiniteScroll", () => {
  it("calls onInfiniteScroll when sentinel intersects and not loading", () => {
    const onInfiniteScroll = vi.fn();
    const observe = vi.fn();
    const unobserve = vi.fn();
    let lastObserverCallback: any;

    // Mock IntersectionObserver and capture the callback created by the component
    (global as any).IntersectionObserver = class {
      callback: any;
      constructor(cb: any) {
        this.callback = cb;
        lastObserverCallback = cb;
      }
      observe = observe;
      unobserve = unobserve;
      disconnect() {}
      trigger(entries: any) {
        this.callback(entries);
      }
    } as any;

    render(
      <InfiniteScroll onInfiniteScroll={onInfiniteScroll} isLoading={false}>
        {[<div key="1">item</div>]}
      </InfiniteScroll>,
    );

    // First intersection (initial mount) - should be ignored
    act(() => {
      lastObserverCallback([{ isIntersecting: true }]);
    });

    // Second intersection (actual scroll) - should trigger callback
    act(() => {
      lastObserverCallback([{ isIntersecting: true }]);
    });

    expect(onInfiniteScroll).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it("does not call onInfiniteScroll when loading", () => {
    const onInfiniteScroll = vi.fn();
    (global as any).IntersectionObserver = class {
      callback: any;
      constructor(cb: any) {
        this.callback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      trigger(entries: any) {
        this.callback(entries);
      }
    } as any;

    render(
      <InfiniteScroll onInfiniteScroll={onInfiniteScroll} isLoading={true}>
        {[<div key="1">item</div>]}
      </InfiniteScroll>,
    );

    const ioInstance = new (global as any).IntersectionObserver(() => {});
    act(() => {
      ioInstance.trigger([{ isIntersecting: true }]);
    });

    expect(onInfiniteScroll).not.toHaveBeenCalled();
  });

  it("does not call onInfiniteScroll on initial mount when sentinel is already visible", () => {
    const onInfiniteScroll = vi.fn();
    let lastObserverCallback: any;

    (global as any).IntersectionObserver = class {
      callback: any;
      constructor(cb: any) {
        this.callback = cb;
        lastObserverCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;

    render(
      <InfiniteScroll onInfiniteScroll={onInfiniteScroll} isLoading={false}>
        {[<div key="1">item</div>]}
      </InfiniteScroll>,
    );

    // Simulate initial intersection on mount (sentinel already visible)
    act(() => {
      lastObserverCallback([{ isIntersecting: true }]);
    });

    // Should not trigger on first intersection
    expect(onInfiniteScroll).not.toHaveBeenCalled();
  });
});
