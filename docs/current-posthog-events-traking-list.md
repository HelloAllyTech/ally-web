Currently Tracked Events Reference

> **Declared ≠ wired.** Every event below exists in
> `apps/ally-helpline-dashboard/src/constants/analyticsEvents.ts`, but a name in that file only
> becomes data when some component calls it. Rows with a **Fires at** entry have a live call site;
> rows without one are declared and not yet emitting anything, so a query against them returns
> nothing. Anyone reasoning about what PostHog actually holds needs that distinction, and anyone
> wiring one of the remaining events should fill in its **Fires at** cell in the same PR.
>
> Two consumers read this data back: PostHog's own dashboards, and ally-be's UX Signals scan
> (`src/ux-signals`), which turns threshold-crossing patterns into Bug Hunter findings and roadmap
> suggestions. Its detectors depend on the events marked below — so unwiring one of those, or
> renaming it, silently turns a detector off rather than breaking it loudly.

### Auth

| Constant            | Event Name          | Description                                         |
| ------------------- | ------------------- | --------------------------------------------------- |
| `USER_LOGGED_IN`    | `user_logged_in`    | Fired on successful login (OTP, Google, magic link) |
| `USER_LOGGED_OUT`   | `user_logged_out`   | Fired when user logs out                            |
| `USER_LOGIN_FAILED` | `user_login_failed` | Fired on failed login attempt                       |

### Navigation

| Constant      | Event Name    | Description                                                        |
| ------------- | ------------- | ------------------------------------------------------------------ |
| `PAGE_VIEWED` | `page_viewed` | Manual page view (auto-fired via `PageviewTracker` as `$pageview`) |

### Calls

| Constant                  | Event Name                | Description                   | Fires at |
| ------------------------- | ------------------------- | ----------------------------- | -------- |
| `CALL_STARTED`            | `call_started`            | Counselor begins a call. Keyed on the `isUserJoined` transition, so both start paths (the `USER_JOINED` socket event and rejoining an already-ACTIVE chat) are covered once | `pages/audio-call/hooks/useMicrophoneMode.ts` |
| `CALL_ENDED`              | `call_ended`              | Call ends. Carries `call_duration_seconds`; paired with `call_started` by a ref, so a call ending via both the API and `AUDIO_CHAT_ENDED` emits once | `pages/audio-call/hooks/useMicrophoneMode.ts` |
| `CALL_FEEDBACK_SUBMITTED` | `call_feedback_submitted` | Post-call feedback submitted  | — |

### Simulation

| Constant                  | Event Name                | Description                 | Fires at |
| ------------------------- | ------------------------- | --------------------------- | -------- |
| `SIMULATION_STARTED`      | `simulation_started`      | The agent actually joined and the learner can practise — **not** merely that a room opened. A session that never got an agent emits nothing, so an infrastructure failure cannot read as a completion problem | `hooks/useLiveKitRoom.ts` (`transitionToAgentJoined`) |
| `SIMULATION_COMPLETED`    | `simulation_completed`    | Room disconnected after a real start. Carries `duration_seconds` and `ended_by_learner`, which separates a finished practice from one that dropped | `hooks/useLiveKitRoom.ts` (`onRoomDisconnect`) |
| `SIMULATION_CREDITS_USED` | `simulation_credits_used` | Credits consumed            | — |

### Audio

| Constant                 | Event Name               | Description           |
| ------------------------ | ------------------------ | --------------------- |
| `AUDIO_UPLOADED`         | `audio_uploaded`         | Audio file uploaded   |
| `AUDIO_PLAYBACK_STARTED` | `audio_playback_started` | Audio playback begins |

### AI / Enhance

| Constant                   | Event Name                 | Description              |
| -------------------------- | -------------------------- | ------------------------ |
| `AI_ENHANCEMENT_TRIGGERED` | `ai_enhancement_triggered` | AI enhancement requested |
| `AI_ENHANCEMENT_COMPLETED` | `ai_enhancement_completed` | AI enhancement finishes  |

### Search

| Constant                | Event Name              | Description                 | Fires at |
| ----------------------- | ----------------------- | --------------------------- | -------- |
| `SEARCH_PERFORMED`      | `search_performed`      | A search ran — typed query, category change, or the query-param restore on load. **Sends `query_length` and `result_count`, never the query text**: helpline search terms carry clinical detail about a caller, so `SEARCH_QUERY` is declared but must not be used | `components/search-resources/SearchResources.tsx` (`triggerSearch`) |
| `SEARCH_RESULT_CLICKED` | `search_result_clicked` | User clicks a search result. Unwired because the shared `ResourceSearch` component handles result clicks internally and exposes no callback — wiring this means adding one to its public API | — |

### Analytics Page

| Constant                   | Event Name                 | Description                       |
| -------------------------- | -------------------------- | --------------------------------- |
| `ANALYTICS_REPORT_VIEWED`  | `analytics_report_viewed`  | Analytics dashboard viewed        |
| `ANALYTICS_FILTER_APPLIED` | `analytics_filter_applied` | A filter is applied to the report |

### Settings

| Constant           | Event Name         | Description         |
| ------------------ | ------------------ | ------------------- |
| `SETTINGS_UPDATED` | `settings_updated` | User saves settings |

### Learn

| Constant              | Event Name            | Description                 |
| --------------------- | --------------------- | --------------------------- |
| `LEARN_MODULE_OPENED` | `learn_module_opened` | A learning module is opened |
| `PATHWAY_STARTED`     | `pathway_started`     | A learning pathway begins   |

### Errors (automatic — no component code needed)

| Constant             | Event Name           | Description                                                            | Fires at |
| -------------------- | -------------------- | ---------------------------------------------------------------------- | -------- |
| `API_ERROR_OCCURRED` | `api_error_occurred` | Any failed RTK Query request — fired automatically by Redux middleware. Carries the endpoint name, which is what the API-error-spike and error-loop detectors group by | `store/index.ts` (middleware) |

### PostHog's own events (no constant, no component code)

Captured by `posthog-js` from its `init` options in `utils/analytics.ts`, and read by the UX Signals
detectors:

| Event Name     | Enabled by                | Read by |
| -------------- | ------------------------- | ------- |
| `$pageview`    | `PageviewTracker` (manual — `capture_pageview` is false) | route-abandonment, funnel detectors |
| `$pageleave`   | `capture_pageleave: true` | route abandonment |
| `$rageclick`   | `autocapture: true`       | rage-click clusters |
| `$dead_click`  | `capture_dead_clicks: true` | dead-click clusters |

---
