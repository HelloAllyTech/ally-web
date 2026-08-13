import { useCallback, useEffect, useRef, useState } from "react";

import { ApiEndpoints, HttpMethod, LOCAL_STORAGE_KEYS } from "@constants";
import { BugHuntEvent, BugHuntRunStatus, RefreshResponse } from "@types";
import { logger } from "@utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Parses SSE frames out of `buffer`. Returns the parsed events plus the
 * unconsumed remainder (a partial frame still streaming in). Same shape as
 * `parseSseBuffer` in `useCopilotStream`, kept as its own small copy rather
 * than a shared import — the two streams carry unrelated event payloads and
 * coupling them for ~15 lines of string splitting isn't worth it.
 */
function parseSseBuffer(buffer: string): {
  events: { type: string; data: unknown }[];
  rest: string;
} {
  const events: { type: string; data: unknown }[] = [];
  const frames = buffer.split(/\r?\n\r?\n/);
  const rest = frames.pop() ?? "";

  for (const frame of frames) {
    let eventName = "";
    const dataLines: string[] = [];
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (!eventName || dataLines.length === 0) continue;
    try {
      events.push({ type: eventName, data: JSON.parse(dataLines.join("\n")) });
    } catch {
      logger.warn(`[Bug Hunt Stream] Dropping malformed SSE frame for event "${eventName}"`);
    }
  }

  return { events, rest };
}

/**
 * Drives the Bug Hunter live run card: streams `GET .../runs/:id/stream` (SSE:
 * event / ping / done) with the same bearer + one-shot 401-refresh-retry flow
 * as `useCopilotStream`. There is no in-process emitter on the backend — the
 * pipeline is an external Claude Code agent reporting over HTTP — so the
 * server itself is polling `BugHuntEvent`; this hook just consumes whatever
 * it pushes.
 */
export const useBugHuntStream = (runId: string | null) => {
  const [events, setEvents] = useState<BugHuntEvent[]>([]);
  const [status, setStatus] = useState<BugHuntRunStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchStreamWithReauth = useCallback(async (url: string, signal: AbortSignal) => {
    const request = (token: string | null) =>
      fetch(url, {
        method: HttpMethod.GET,
        headers: {
          Accept: "text/event-stream",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        signal,
      });

    let response = await request(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN));
    if (response.status !== 401) return response;

    const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
    if (!refreshToken) return response;

    const refreshResponse = await fetch(`${API_BASE_URL}/api${ApiEndpoints.AUTH.REFRESH}`, {
      method: HttpMethod.POST,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal,
    });
    if (!refreshResponse.ok) return response;

    const tokens = (await refreshResponse.json()) as RefreshResponse;
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, tokens.refreshToken);

    response = await request(tokens.accessToken);
    return response;
  }, []);

  useEffect(() => {
    setEvents([]);
    setStatus(null);
    if (!runId) return undefined;

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const url = `${API_BASE_URL}/api${ApiEndpoints.BUG_HUNTER.RUN_STREAM(runId)}`;
        const response = await fetchStreamWithReauth(url, controller.signal);
        if (!response.ok || !response.body) {
          throw new Error(`Bug Hunt stream request failed (${response.status})`);
        }
        setIsConnected(true);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events: parsed, rest } = parseSseBuffer(buffer);
          buffer = rest;
          for (const event of parsed) {
            if (event.type === "event") {
              setEvents(prev => [...prev, event.data as BugHuntEvent]);
            } else if (event.type === "done") {
              setStatus((event.data as { status: BugHuntRunStatus }).status);
            }
            // "ping" is a keep-alive only.
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          logger.error(`[Bug Hunt Stream] ${error}`);
        }
      } finally {
        setIsConnected(false);
      }
    })();

    return () => controller.abort();
  }, [runId, fetchStreamWithReauth]);

  return { events, status, isConnected };
};
