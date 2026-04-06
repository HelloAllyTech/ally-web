Currently Tracked Events Reference

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

| Constant                  | Event Name                | Description                   |
| ------------------------- | ------------------------- | ----------------------------- |
| `CALL_STARTED`            | `call_started`            | Counselor begins a call       |
| `CALL_ENDED`              | `call_ended`              | Call ends (includes duration) |
| `CALL_FEEDBACK_SUBMITTED` | `call_feedback_submitted` | Post-call feedback submitted  |

### Simulation

| Constant                  | Event Name                | Description                 |
| ------------------------- | ------------------------- | --------------------------- |
| `SIMULATION_STARTED`      | `simulation_started`      | A simulation session begins |
| `SIMULATION_COMPLETED`    | `simulation_completed`    | Simulation finishes         |
| `SIMULATION_CREDITS_USED` | `simulation_credits_used` | Credits consumed            |

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

| Constant                | Event Name              | Description                 |
| ----------------------- | ----------------------- | --------------------------- |
| `SEARCH_PERFORMED`      | `search_performed`      | A search query is submitted |
| `SEARCH_RESULT_CLICKED` | `search_result_clicked` | User clicks a search result |

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

| Constant             | Event Name           | Description                                                            |
| -------------------- | -------------------- | ---------------------------------------------------------------------- |
| `API_ERROR_OCCURRED` | `api_error_occurred` | Any failed RTK Query request — fired automatically by Redux middleware |

---
