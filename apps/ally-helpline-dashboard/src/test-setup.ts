import "@testing-library/jest-dom";
import { beforeAll, expect, vi } from "vitest";

// Mock posthog-js globally — no network calls in tests, all methods are spies
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    group: vi.fn(),
    isFeatureEnabled: vi.fn(() => false),
    people: { set: vi.fn() },
    debug: vi.fn(),
  },
}));
import path from "path";
import i18n from "./i18n";

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds = [];

  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock WebSocket
global.WebSocket = class WebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  constructor() {}
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {}
} as any;

// Mock MediaDevices
Object.defineProperty(navigator, "mediaDevices", {
  writable: true,
  value: {
    getUserMedia: vi.fn(),
    enumerateDevices: vi.fn(),
  },
});

// Mock AudioContext
global.AudioContext = class AudioContext {
  baseLatency = 0;
  outputLatency = 0;
  sampleRate = 44100;
  state = "running";

  constructor() {}
  createAnalyser() {
    return {
      frequencyBinCount: 0,
      getByteFrequencyData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  createMediaStreamSource() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  createMediaElementSource() {
    return {};
  }
  createMediaStreamDestination() {
    return {};
  }
  close() {}
  suspend() {
    return Promise.resolve();
  }
  resume() {
    return Promise.resolve();
  }
} as any;

// Custom snapshot serializer to normalize file paths to relative paths
expect.addSnapshotSerializer({
  test: val => typeof val === "string" && val.includes("fileName:"),
  print: val => {
    const str = val as string;
    // Replace absolute paths with relative paths in snapshots
    const normalizedStr = str.replace(/fileName: "([^"]+)"/g, (match, filePath) => {
      // Convert absolute path to relative path from project root
      const relativePath = path.relative(process.cwd(), filePath);
      return `fileName: "${relativePath}"`;
    });
    return normalizedStr;
  },
});

beforeAll(async () => {
  if (!i18n.isInitialized) {
    await new Promise<void>(resolve => {
      i18n.on("initialized", () => resolve());
    });
  }
  await i18n.changeLanguage("en");
});

// Mock scrollIntoView for DOM elements
Element.prototype.scrollIntoView = vi.fn();

// jsdom has no layout, so window.scrollTo is unimplemented and logs a noisy
// "Not implemented" for any component that scrolls the page on mount.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
