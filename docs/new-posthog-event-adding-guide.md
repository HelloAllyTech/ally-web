### The 4-step process

#### Step 1 — Register the event name

Open `src/constants/analyticsEvents.ts` and add your event to `ANALYTICS_EVENTS`
under the appropriate comment group:

```typescript
export const ANALYTICS_EVENTS = {
  // ... existing events ...

  // Notes
  NOTES_PANEL_OPENED: "notes_panel_opened", // ← add here
} as const;
```

**Naming rule:** `<noun>_<past_tense_verb>`, all lowercase, underscores only.
PostHog is case-sensitive — be consistent.

#### Step 2 — Register any new property keys (if needed)

In the same file, add to `ANALYTICS_PROPS` if your event needs a property key
that does not already exist:

```typescript
export const ANALYTICS_PROPS = {
  // ... existing props ...
  NOTE_LENGTH: "note_length", // ← add here if needed
} as const;
```

Skip this step if the properties you need already exist (e.g. `CALL_ID`,
`SCENARIO_ID`, `USER_ROLE` are already defined).

#### Step 3 — Call `track()` in your component or hook

```typescript
import { useAnalytics } from "@hooks";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";

function NotesPanel({ callId }: { callId: string }) {
  const { track } = useAnalytics();

  useEffect(() => {
    // user_role is injected automatically — you don't need to add it
    track(ANALYTICS_EVENTS.NOTES_PANEL_OPENED, {
      [ANALYTICS_PROPS.CALL_ID]: callId,
    });
  }, []);

  return <div>...</div>;
}
```

PostHog will receive:

```json
{
  "event": "notes_panel_opened",
  "properties": {
    "call_id": "call-abc123",
    "user_role": "COUNSELOR"
  }
}
```

#### Step 4 — Write a test

`posthog-js` is globally mocked in `test-setup.ts` — no real network calls are made.
Assert that `posthog.capture` was called with the right event name and properties.

```typescript
import { renderHook, act } from "@testing-library/react";
import posthog from "posthog-js";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { useAnalytics } from "../useAnalytics";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";

describe("notes panel tracking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires notes_panel_opened with call_id and auto-injected user_role", () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: createTestWrapper({ userRole: "COUNSELOR" }),
    });

    act(() => {
      result.current.track(ANALYTICS_EVENTS.NOTES_PANEL_OPENED, {
        [ANALYTICS_PROPS.CALL_ID]: "call-abc123",
      });
    });

    expect(posthog.capture).toHaveBeenCalledWith(
      "notes_panel_opened",
      expect.objectContaining({
        call_id: "call-abc123",
        user_role: "COUNSELOR", // injected automatically by useAnalytics
      }),
    );
  });
});
```

---

### Full checklist

- [ ] Add event name to `ANALYTICS_EVENTS` in `src/constants/analyticsEvents.ts`
- [ ] Add any new property keys to `ANALYTICS_PROPS` (same file, if needed)
- [ ] Call `track(ANALYTICS_EVENTS.YOUR_EVENT, { ... })` in your component or hook
- [ ] Write a test asserting `posthog.capture` was called with the correct event and properties
- [ ] No other files need to change

---

### Complete worked example

**Scenario:** Track when a counselor opens the feedback form during a call.

**`src/constants/analyticsEvents.ts`**

```typescript
// Calls
CALL_FEEDBACK_FORM_OPENED: "call_feedback_form_opened",
```

**`src/constants/analyticsEvents.ts` — ANALYTICS_PROPS**

```typescript
// No new props needed — CALL_ID and CALL_TYPE already exist
```

**`src/pages/calls/FeedbackForm.tsx`**

```typescript
import { useAnalytics } from "@hooks";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";

export function FeedbackForm({ callId, callType }: Props) {
  const { track } = useAnalytics();

  const handleOpen = () => {
    track(ANALYTICS_EVENTS.CALL_FEEDBACK_FORM_OPENED, {
      [ANALYTICS_PROPS.CALL_ID]:   callId,
      [ANALYTICS_PROPS.CALL_TYPE]: callType,
    });
    // ... rest of open logic
  };

  return <button onClick={handleOpen}>Give Feedback</button>;
}
```

**`src/pages/calls/__tests__/FeedbackForm.test.tsx`**

```typescript
it("fires call_feedback_form_opened when feedback button is clicked", async () => {
  render(<FeedbackForm callId="call-1" callType="voice" />, {
    wrapper: createTestWrapper({ userRole: "COUNSELOR" }),
  });

  await userEvent.click(screen.getByText("Give Feedback"));

  expect(posthog.capture).toHaveBeenCalledWith(
    "call_feedback_form_opened",
    expect.objectContaining({
      call_id:   "call-1",
      call_type: "voice",
      user_role: "COUNSELOR",
    }),
  );
});
```
