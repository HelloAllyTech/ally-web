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

A **text-chat** roleplay adds `interaction_mode: "TEXT"` to `simulation_started` and
`simulation_completed`. Voice sessions send no `interaction_mode` at all, so their payload is
unchanged and "absent" reads as voice — filter text sessions with `interaction_mode = TEXT`
rather than `!= VOICE`.

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

Dot-namespaced by the product analytics spec, so these three deliberately break the
`<noun>_<verb>` convention above.

| Constant                 | Event Name               | Properties                                                                        | Description                                                                                                                                                                  |
| ------------------------ | ------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LEARN_PAGE_VIEWED`      | `learn.page_viewed`      | `initial_tab`                                                                     | The Learn page loads for any reason (first login, sidebar click, refresh). Fires once per visit, after the tab queries settle, and reports the tab actually shown            |
| `LEARN_TAB_SWITCHED`     | `learn.tab_switched`     | `tab`                                                                             | The learner switches Learn tabs. Never fires for the default tab, nor for re-clicking the active one                                                                         |
| `CASE_OPENED`            | `case.opened`            | `case_id`, `case_name`, `simulation_count`                                        | A Case detail page has finished loading and shows its image, description and simulations                                                                                     |
| `PATHWAY_OPENED`         | `pathway.opened`         | `pathway_id`, `pathway_name`, `simulation_count`                                  | A Learning Pathway detail page has finished loading and shows its description and ordered simulations                                                                        |
| `SIMULATION_OPENED`      | `simulation.opened`      | `simulation_id`, `simulation_name`, `has_trigger_warning`, `has_completed_before` | A standalone simulation's detail page has finished loading and shows the character photo, situation brief and Start/Practise again button                                    |
| `ROLEPLAY_START_CLICKED` | `roleplay.start_clicked` | `entry_point`, `item_id`, `item_name`                                             | The learner presses Start / Practise again / Continue on a Case, Simulation or Pathway detail page, or the Learn streak widget's CTA. Intent only — the call has not started |

`initial_tab` / `tab` values are product-facing, not the internal tab ids:
`cases`, `simulations`, `learning_pathway` (internally `tracks`), `courses`.

`simulation.opened` sends `simulation_id` as a **string**, per the spec, even though the
scenario id is numeric on the wire. `has_completed_before` is derived from the `completion`
record (absent means never completed), `has_trigger_warning` from a non-empty `triggerWarnings`.

`roleplay.start_clicked` sends `entry_point` as one of `case`, `simulation`, `pathway`,
`streak_widget` (see `ROLEPLAY_ENTRY_POINT`). `item_id`/`item_name` name the thing whose Start
button was pressed — the case or pathway itself on those pages, the scenario on a simulation
page or behind the streak CTA. Both ids are sent as strings, so the numeric scenario id is
stringified. The streak CTA reports even when no active scenario exists to jump to, in which
case it sends `entry_point` alone: the tap is the intent, and dropping it would flatter the
widget's conversion rate.

Where the learner was offered a choice between a voice call and a text chat (their org has
text-chat roleplays on and the roleplay offers it), `roleplay.start_clicked` also sends
`interaction_mode` (`VOICE` or `TEXT`) from the simulation page. Everywhere else the property
is absent, which keeps it a measure of what people choose when they can.

`case.opened`, `pathway.opened` and `simulation.opened` do **not** yet send `skill_area` — the
spec marks it PROPOSED — UNCONFIRMED and none of the detail endpoints return such a field. Add
it here when the API does.

### Roleplay Summary (post-session)

| Constant                         | Event Name                       | Description                                           |
| -------------------------------- | -------------------------------- | ----------------------------------------------------- |
| `ROLEPLAY_SUMMARY_TAB_VIEWED`    | `roleplay_summary.tab_viewed`    | Learner switches tabs on the Roleplay Summary page    |
| `ROLEPLAY_SUMMARY_SHARE_TOGGLED` | `roleplay_summary.share_toggled` | "Share for review" toggle flipped on the summary page |
| `ROLEPLAY_SUMMARY_RATED`         | `roleplay_summary.rated`         | Learner submits the "useful practice?" star rating    |
| `BADGE_UNLOCKED`                 | `badge.unlocked`                 | A newly earned badge is surfaced to the learner       |

`roleplay_summary.tab_viewed` sends `scenario_session_id` and `tab`, one of `debrief`,
`skills_demonstrated`, `annotated_transcript`, `up_next` (see `ROLEPLAY_SUMMARY_TAB`). It does
**not** fire for the tab shown on load, nor for the fallback reassignment that happens when a
roleplay has Debrief switched off — only a real click counts.

`roleplay_summary.rated` fires on a successful feedback submit, so a failed POST reports
nothing. `has_feedback_text` is whether the free-text box was non-empty after trimming; the
selected rating tags are not sent.

`badge.unlocked` fires from `useAchievementBadgeModal` as each badge is surfaced, once per
`badge_id` per session — the unviewed-badges query refetches on focus and reconnect, so the same
badge can reappear before its view-status write lands.

### Review

| Constant                     | Event Name                   | Description                                             |
| ---------------------------- | ---------------------------- | ------------------------------------------------------- |
| `REVIEW_FILTER_CHANGED`      | `review.filter_changed`      | All / Read / Unread filter switched on the Review inbox |
| `REVIEW_CONVERSATION_OPENED` | `review.conversation_opened` | "Review Conversation" opened from the inbox             |
| `REVIEW_COMMENT_ADDED`       | `review.comment_added`       | A comment is submitted on a reviewed roleplay           |
| `REVIEW_RECORDING_PLAYED`    | `review.recording_played`    | Play pressed on a past roleplay's audio recording       |

`review.filter_changed` fires from both the Simulation and Scribe tabs and does not fire for the
filter already active. `filter` is lower-cased (`all` / `read` / `unread`).

`review.conversation_opened` sends `review_id`, `simulation_name` and `actor_type` (`learner`
when the current user shared the session, `reviewer` otherwise). It does **not** send
`reviewer_name`: the inbox payload (`ReviewItem`) carries who _shared_ the session, not who
reviewed it. Add it when the list endpoint returns a reviewer.

`review.comment_added` covers both comment surfaces on a review — the general comment box and a
comment anchored to a transcript selection. `comment_length` is the raw character count.
Replies inside an existing thread (`CommentCard`) are not counted as new comments.

`review.recording_played` fires only on the not-playing → playing edge, so pausing and reaching
the end of the clip report nothing. `source` is `review_list` (the inbox card) or
`conversation_detail` (the full conversation view).

### Community

| Constant                      | Event Name                    | Description                                          |
| ----------------------------- | ----------------------------- | ---------------------------------------------------- |
| `COMMUNITY_PERIOD_CHANGED`    | `community.period_changed`    | Leaderboard time window changed                      |
| `ACHIEVEMENTS_OPENED`         | `achievements.opened`         | "View all badges" opened from the Achievements panel |
| `ACHIEVEMENTS_FILTER_CHANGED` | `achievements.filter_changed` | All / Unlocked filter switched on the badges page    |

`community.period_changed` translates the leaderboard's internal window codes to the spec's
calendar-length names via `COMMUNITY_PERIOD`: `LAST_WEEK` → `last_7_days`, `LAST_MONTH` →
`last_28_days`, `LAST_YEAR` → `last_364_days`, `ALL_TIME` → `all_time`.

`achievements.opened` sends `unlocked_count` from the viewed-badges count the panel already
displays, so it is the number the learner just saw, not a second query.

### Roleplay Logs

| Constant                      | Event Name                    | Description                                 |
| ----------------------------- | ----------------------------- | ------------------------------------------- |
| `ROLEPLAY_LOG_SUMMARY_VIEWED` | `roleplay_log.summary_viewed` | Summary icon clicked on a Roleplay Logs row |

`call_id` is the human-readable session name shown in the Call ID column (e.g.
`SS-3816-2026-08-24`), not the internal row id.

### Statistics

| Constant                        | Event Name                      | Description                                       |
| ------------------------------- | ------------------------------- | ------------------------------------------------- |
| `STATISTICS_DATE_RANGE_CHANGED` | `statistics.date_range_changed` | Date-range toggle changed on Organization Metrics |

Fired from the native (Carbon charts) Organization Metrics range toggle — the only in-app
date-range control on the Statistics page. `range` is the raw range code (`7d`, `30d`, …).

The Metabase-embedded dashboards on this page (Real call logs / Simulations) render inside a
**cross-origin iframe**, so their own date filter and their "Export as PDF" button cannot be
instrumented from this app. `statistics.exported` is therefore **not implemented**; it needs
either a native export or a Metabase-side event.

### Account & Global

| Constant                   | Event Name                 | Description                                           |
| -------------------------- | -------------------------- | ----------------------------------------------------- |
| `PROFILE_SETTINGS_OPENED`  | `profile_settings.opened`  | Profile Settings opened from the sidebar account menu |
| `PROFILE_UPDATED`          | `profile.updated`          | Profile Settings saved with Done                      |
| `DATA_POLICY_VIEWED`       | `data_policy.viewed`       | Ally's Data policy opened from the account menu       |
| `ACCOUNT_LOGGED_OUT`       | `user.logged_out`          | Logout confirmed from the account menu                |
| `REPORT_PROBLEM_SUBMITTED` | `report_problem.submitted` | "Report a problem" form submitted                     |
| `LANGUAGE_CHANGED`         | `language.changed`         | Roleplay language changed                             |
| `STREAK_HISTORY_EXPANDED`  | `streak.history_expanded`  | Practice-history heatmap opened, or its view switched |

`user.logged_out` is dot-namespaced per the spec and is **distinct from** the legacy
`user_logged_out` above, which `useAnalytics().trackLogout` still emits. It fires on confirming
the logout dialog, not on opening it — the dialog can be cancelled.

`profile.updated` always sends `name_changed: false` today: Profile Settings renders the name as
a disabled input and the form only carries `profileImageUrl`. It is sent anyway so the payload
matches the spec if the field opens up.

`language.changed` sends `source` as `sidebar` or `roleplay_confirmation_modal` (see
`LANGUAGE_CHANGE_SOURCE`). The sidebar selector reports the English language name rather than
the native display label, so the value stays stable as labels are localised; the roleplay
confirmation picker reports the label the scenario's language list supplies.

`streak.history_expanded` covers both halves of the spec — opening the history panel and
switching it between Day / Week / Month — with `view` naming the grouping the learner ends up
looking at. Collapsing the panel reports nothing.

### Text helpline

The anonymous talker page (`/talk/:tenantCode`) and the listener workspace (`/helpline/*`). **No
content, ever**: no message text, display names, summaries, risk signals or notes — only the chat
uuid (`chat_id`) and coarse enums/counts. The talker page root and the listener transcript, copilot
and summary containers carry `ph-no-capture`, so session replay and autocapture skip them too.
Talker events have no signed-in user, so `user_role` is `unknown`.

| Constant                          | Event Name                        | Description | Fires at |
| --------------------------------- | --------------------------------- | ----------- | -------- |
| `TALKER_SESSION_STARTED`          | `talker_session_started`          | A talker accepted consent and joined the queue. Sends `chat_id`, `language`, `has_display_name` (boolean, never the name), `chat_status` | `pages/helpline-talk/useTalkerSession.ts` |
| `TALKER_QUEUE_LEFT`               | `talker_queue_left`               | A waiting talker left the queue (Leave → confirm). Sends `chat_id`, `wait_seconds` | `pages/helpline-talk/useTalkerSession.ts` |
| `TALKER_CHAT_ENDED`               | `talker_chat_ended`               | A talker ended an active chat (End chat → confirm). Sends `chat_id` | `pages/helpline-talk/useTalkerSession.ts` |
| `TALKER_FEEDBACK_SUBMITTED`       | `talker_feedback_submitted`       | The one-question rating after a chat. Sends `chat_id`, `rating` (1–5), `has_feedback_text` (boolean, never the comment) | `pages/helpline-talk/useTalkerSession.ts` |
| `TALKER_CONVERSATION_DELETED`     | `talker_conversation_deleted`     | A talker erased their conversation. Sends `chat_id`, `screen` | `pages/helpline-talk/useTalkerSession.ts` |
| `TALKER_QUICK_EXIT_USED`          | `talker_quick_exit_used`          | Quick exit pressed. Sends `screen` and `chat_id` when there is a chat | `pages/helpline-talk/useTalkerSession.ts` |
| `HELPLINE_CHAT_CLAIMED`           | `helpline_chat_claimed`           | A listener claimed a waiting chat. Sends `chat_id`, `risk_level`, `wait_seconds` | `pages/helpline/HelplineLobby.tsx` |
| `HELPLINE_SUGGESTION_INSERTED`    | `helpline_suggestion_inserted`    | A listener pressed **Use** on a copilot suggestion (inserted into the composer, never sent). Sends `chat_id`, `skill_key`, `suggestion_index` | `pages/helpline/HelplineChatView.tsx` |
| `HELPLINE_RISK_ACKNOWLEDGED`      | `helpline_risk_acknowledged`      | A listener acknowledged a risk flag. Sends `chat_id`, `risk_level`, `risk_source`, `risk_outcome` (never the signal or note) | `pages/helpline/HelplineChatView.tsx` |
| `HELPLINE_CHAT_ENDED_BY_LISTENER` | `helpline_chat_ended_by_listener` | A listener ended a chat (End chat → confirm). Sends `chat_id`, `risk_level`, `message_count` | `pages/helpline/HelplineChatView.tsx` |
| `HELPLINE_TRANSFER_REQUESTED`     | `helpline_transfer_requested`     | The listener of record or a supervisor asked for a chat to be passed on (Request transfer → confirm). Sends `chat_id`, `actor` (`listener` \| `supervisor`), `has_target` (boolean, never who) | `pages/helpline/HelplineChatView.tsx` |
| `HELPLINE_CHAT_ASSIGNED`          | `helpline_chat_assigned`          | A supervisor pointed a waiting chat at one listener from the Monitor (Assign to… → confirm). Sends `chat_id`, `risk_level` | `pages/helpline/HelplineMonitor.tsx` |
| `HELPLINE_CHAT_TAKEN_OVER`        | `helpline_chat_taken_over`        | A supervisor took over a chat as its listener (Take over → confirm). Sends `chat_id`, `risk_level` | `pages/helpline/HelplineChatView.tsx` |
| `HELPLINE_WHISPER_SENT`           | `helpline_whisper_sent`           | A supervisor sent a whisper to the listener (staff-only). Sends `chat_id` only — never the whisper | `pages/helpline/HelplineChatView.tsx` |
| `HELPLINE_TALKER_BLOCKED`         | `helpline_talker_blocked`         | A supervisor blocked a talker (Block talker → confirm). Sends `chat_id`, `has_reason` (boolean, never the reason) | `pages/helpline/HelplineChatView.tsx` |
| `HELPLINE_SUPERVISOR_ALERTED`     | `helpline_supervisor_alerted`     | The listener of record pressed **Alert a supervisor**. Sends `chat_id`, `has_note` (boolean, never the note), `alerted_count` (how many supervisors the server reached; 0 means none is set up) | `pages/helpline/HelplineChatView.tsx` |
| `HELPLINE_QA_VIEWED`              | `helpline_qa_viewed`              | Someone opened a chat's helping-skills feedback. Sends `chat_id`, `viewer` (`self` for the listener's own feedback, `supervisor` otherwise) — never scores or behaviours | `pages/helpline/HelplineQaDetail.tsx` |

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

### Admin & Organization

| Constant               | Event Name              | Description                                          |
| ---------------------- | ----------------------- | ---------------------------------------------------- |
| `UPGRADE_PROMPT_SHOWN` | `upgrade.prompt_shown`  | An upgrade prompt or paywall is shown to a learner or admin |
| `UPGRADE_CLICKED`      | `upgrade.clicked`       | Learner or admin clicks an upgrade call-to-action     |

`upgrade.prompt_shown` sends `org_id`, `trigger_source`, `current_plan`; `upgrade.clicked` sends
`org_id`, `current_plan`, `target_plan`. Both are **registered but not yet emitted** — this app has
no paywall or upgrade surface today. `useAnalytics()` exposes `trackUpgradePromptShown` and
`trackUpgradeClicked` so whichever screen introduces the prompt fires the spec payload without
re-deriving the property names.
