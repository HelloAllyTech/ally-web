# Simulation Feedback — What Changed and Why

## The Big Picture (Before vs. After)

### Before

After finishing a simulation (role-play session), the app would **automatically pop up a feedback dialog when the user tried to close the summary panel** — but only if:
- They had been on the summary screen for more than 30 seconds (a hidden timer)
- They hadn't already submitted feedback
- They had the right permission (`EDIT_SCENARIO_SESSION`)

The star rating only existed inside that popup. There was no star widget visible on the summary screen itself. Also, the full post-simulation page (`/simulation-summary/:id`) never showed a feedback prompt at all — only the sidebar did.

### After

Feedback is now **user-driven, not auto-triggered**:

- A **5-star widget appears directly in the summary header** (next to the "Summary" title)
- The user clicks any star → the feedback dialog opens **already pre-filled with that star**
- If feedback was already submitted, the stars show the old rating in read-only mode with a "Thanks for your feedback" tooltip
- The old 30-second timer auto-popup is completely removed
- The full post-simulation page now also has this star widget + a one-time soft nudge if the user tries to leave without rating

Think of it like: **Before** = a popup that surprised you when closing. **After** = stars always visible in the header, click when you're ready.

---

## The Full Flow, Step by Step

```
User finishes simulation
        ↓
Summary panel / full page opens
        ↓
5 empty stars appear in the header (next to "Summary" title)
        ↓
User clicks a star (e.g., clicks 4 out of 5)
        ↓
Feedback dialog opens — already showing 4 stars selected
Dialog also shows tag suggestions: "good", "clear", "engaging", "smooth", "solid"
User can toggle tags and/or write a comment
        ↓
User clicks Submit
        ↓
Dialog closes. Stars in the header now show 4 filled, non-clickable stars
Tooltip appears: "Thanks for your feedback"

--- Alternative: User tries to leave without rating (full page only) ---

User clicks Back button or "Try Another" without giving feedback
        ↓
Feedback dialog opens as a soft nudge (one time only per visit)
        ↓
User can submit feedback OR just dismiss — either way they navigate away
```

---

## File-by-File Breakdown

---

### 1. `components/session-rating-trigger/SessionRatingTrigger.tsx` — Brand new file

**What it is:** The 5-star widget that sits in the header of the summary screen.

**Problem it solves:** There was no visible star UI on the summary. Feedback was hidden behind an auto-popup users didn't control. This component makes feedback always discoverable.

**How it works:**

- Renders 5 star buttons side by side
- When you hover over a star, all stars up to that one highlight (preview effect)
- When you click a star, it calls `onSelect(rating)` — the parent component uses this to open the feedback dialog
- `readOnly` mode: stars are disabled, show the previously submitted rating, and wrap in a tooltip saying "Thanks for your feedback"

It also supports **keyboard navigation** (arrow keys to move between stars, Enter/Space to select) for accessibility.

```
Interactive:  ☆ ☆ ☆ ☆ ☆   ← user can hover/click
After rating: ★ ★ ★ ★ ☆   ← read-only, shows rating=4, tooltip on hover
```

---

### 2. `pages/calls/components/SimulationSummarySidebar.tsx` — Sidebar version (calls page)

**What it is:** The right-side panel that slides in when you open a simulation summary from the calls list.

**What was removed and why:**

The old code had:
- A `startTimeRef` that tracked when the sidebar opened
- A `hasFeedback` ref that tracked whether feedback was already submitted
- A `hasThresholdElapsed()` function that checked if 30+ seconds had passed
- An `onSidebarClose` function that checked all these conditions and auto-opened the dialog

All of this is gone. The auto-prompt-on-close behavior is replaced by the header star widget.

**What was added:**

- `pendingRating` state — stores which star the user clicked before the dialog opens
- `submittedRating` state — stores the rating after the dialog closes (so the header stays filled)
- `SessionRatingTrigger` embedded in the sidebar title bar
- `handleStarSelect` and `handleFeedbackClose` functions to wire it all together

**New flow inside this file:**

```
User clicks star 4 in header
  → handleStarSelect(4) runs
  → pendingRating = 4
  → showFeedbackDialog = true (dialog opens with 4 pre-selected)

User submits or closes dialog
  → handleFeedbackClose() runs
  → submittedRating = 4 (header now shows 4 filled stars)
  → showFeedbackDialog = false
  → pendingRating = null (cleared)
```

**`displayRating`** — what the star widget actually shows. Priority order:
1. A rating the user just submitted this session (`submittedRating`)
2. A rating the backend returned (`summaryData?.sessionFeedback?.rating`)
3. Falls back to 0 (empty stars)

**`isReadOnly`** — if `summary.hasFeedback` is true (backend confirmed feedback was submitted), stars go into read-only mode so the user can't submit twice.

---

### 3. `pages/post-simulation-summary/PostSimulationSummary.tsx` — Full page version

**What it is:** The full-page summary shown right after finishing a simulation (not the sidebar — this is its own dedicated page at `/simulation-summary/:id`).

**What changed:**

Very similar star widget additions as the sidebar, plus one extra feature: the **exit guard**.

**New state:**
- `feedbackOpen`, `pendingRating`, `submittedRating` — same as sidebar
- `pendingExit` — stores the navigation action the user triggered (go back / try another)
- `exitPromptShown` ref — ensures the exit prompt only fires once per page visit

**`guardExit(navigate)`** — the key new function here:

```
User clicks "Go Back" or "Try Another"
  → guardExit(navigateFunction) is called

  Case A — no feedback yet AND prompt not shown yet:
    → Store the navigate function in pendingExit
    → Open feedback dialog as a soft nudge
    → Mark prompt as shown (so it won't repeat)

  When dialog closes (submit OR dismiss):
    → Run the stored pendingExit() → user navigates away

  Case B — feedback already submitted OR prompt already shown:
    → Navigate immediately, no dialog
```

The user is never blocked. The prompt appears once, they can ignore it, and they still leave. The `exitPromptShown` ref prevents it from triggering again if they click the back button a second time.

---

### 4. `containers/feedback-dialog/components/SimulationFeedback.tsx` — The dialog form

**What it is:** The actual content inside the feedback popup (stars + tags + comment box).

**What changed:**

**Before:** Just a star rating input + a text comment box. Rating always started at 0.

**After:**

1. **`initialRating` prop** — if the user clicked 4 stars in the header, the dialog opens with 4 already selected. Without this, the user would have to click again inside the dialog, which is annoying.

2. **Tag suggestions** — each star rating now has 5 associated short descriptive tags the user can toggle:

```
Rating 1 → ["poor", "unclear", "distorted", "noisy", "inconsistent"]
Rating 2 → ["average", "weak", "rough", "patchy", "dull"]
Rating 3 → ["decent", "acceptable", "balanced", "okay", "fair"]
Rating 4 → ["good", "clear", "engaging", "smooth", "solid"]
Rating 5 → ["excellent", "crisp", "immersive", "flawless", "outstanding"]
```

3. **Tags reset when rating changes** — there's a `useEffect` watching the `rating` value. When the user changes their star rating, `selectedTags` clears automatically. This prevents stale tags (e.g., "noisy" tag selected while rating was 1, then rating changed to 5).

4. **Tags are UI-only for now** — there's a `// TODO` comment in the submit function. The tags are not sent to the backend yet because the backend API doesn't support it. The type definitions and enum are there ready, but the actual data isn't included in the request payload until the backend is updated.

---

### 5. `containers/feedback-dialog/FeedbackDialog.tsx` — The dialog wrapper

**What it is:** The modal container that wraps `SimulationFeedback` (or `CallFeedback` for call sessions).

**What changed:** One addition — it now accepts `initialRating` as a prop and passes it down to `SimulationFeedback`.

This is a pattern called **prop drilling** — a value flows from parent to child to grandchild:

```
SimulationSummarySidebar (pendingRating=4)
  → FeedbackDialog (initialRating=4)
    → SimulationFeedback (initialRating=4) → useState starts at 4
```

---

### 6. `containers/feedback-dialog/types.ts` — TypeScript interfaces

Added `initialRating?: number` to both `FeedbackDialogProps` and `FeedbackSectionProps`.

The `?` means it's optional — if the caller doesn't pass it, the rating starts at 0. Old behavior is fully preserved.

---

### 7. `containers/simulation-summary-state/useSimulationSummaryPolling.ts` — Data fetching

**What it is:** A hook that asks the backend for the simulation summary every 3.5 seconds, up to 5 times, until it gets a complete response.

**What changed — a temporary workaround:**

```ts
const MOCK_SESSION_FEEDBACK = { rating: 5 };
```

**Why this exists:** The backend currently returns `hasFeedback: true/false` but does NOT return the actual rating number (`sessionFeedback`). The UI needs the number to show filled stars in read-only mode.

Temporary fix: if `hasFeedback` is true and `sessionFeedback` is missing from the response, inject a fake `{ rating: 5 }` so the UI at least shows stars are filled. There's a `// TODO` to remove this when the backend starts returning the real data.

The `console.log` added here is also temporary for debugging — also marked for removal.

---

### 8. `types/learn.ts` — TypeScript type definitions

Added `sessionFeedback` field to the `SimulationSummary` type:

```ts
sessionFeedback?: { rating: number; feedback?: string; issues?: string[] }
```

This tells TypeScript that the summary object *might* contain the user's previous rating. The `?` makes it optional because the backend doesn't always return it yet.

Also added a `// TODO` note next to `SubmitSimulationFeedbackRequest` so it's easy to find where to add `issues` once the backend API is extended.

---

### 9. `types/common.ts` — Shared enums

Added a new enum `SimulationIssueOptions`:

```ts
enum SimulationIssueOptions {
  SCENARIO_UNREALISTIC,
  POOR_AI_RESPONSE,
  INSTRUCTIONS_UNCLEAR,
  TOO_EASY,
  TOO_DIFFICULT,
  TECHNICAL_ISSUES,
  OTHER,
}
```

These are the "what went wrong" categories for low ratings. They're defined as a proper enum (not plain strings) so they can be reused safely across the codebase without typos. Currently not yet used in the UI tags (the tags use plain strings) — this is preparation for when the backend supports sending structured issue categories.

---

### 10. `i18n/locales/en.json` — Text / translations

Added all display text for the new feedback UI under the `simulationFeedback` key:

- Labels for title, subtitle, submit button text
- Per-star description text (1 = "Needs major improvements", 5 = "Excellent and highly effective!")
- Issue category labels for a future structured picker
- Placeholder text for the comment box
- `thanksTooltip` for the read-only stars

The pattern here: **never hardcode display text inside components**, always reference a translation key. This way the app can be translated to other languages without touching component code.

---

## How All the Pieces Connect (the Full Picture)

```
en.json
  ↓ provides all text labels
  
SessionRatingTrigger    ← new star widget, lives in the header
  ↓ user clicks a star → onSelect(rating) fires
  
SimulationSummarySidebar   OR   PostSimulationSummary
  ↓ stores pendingRating, opens FeedbackDialog
  
FeedbackDialog
  ↓ receives initialRating, passes it to SimulationFeedback
  
SimulationFeedback          ← the actual form
  ↓ starts with initialRating pre-filled
  ↓ shows tags for that rating level
  ↓ user submits
  
Backend API  (submitSimulationFeedbackMutation)
  ↓ success → dialog closes
  
submittedRating state updates in parent
  ↓
SessionRatingTrigger receives new value, switches to readOnly mode
  ↓
Header shows filled stars + "Thanks for your feedback" tooltip

--- Separately ---

useSimulationSummaryPolling
  ↓ polls backend for summary data
  ↓ if hasFeedback=true, injects MOCK_SESSION_FEEDBACK (temp workaround)
  ↓ passes data up to the sidebar/page
SessionRatingTrigger reads sessionFeedback.rating to show old rating on page reload
```

---

## Summary Table

| Aspect | Before | After |
|---|---|---|
| How feedback is triggered | Auto-popup when closing sidebar (30s timer) | User clicks a star in the header |
| Feedback on full page | Never shown | Star widget + exit-intent nudge |
| Star pre-selection in dialog | Always starts at 0 | Pre-fills with the star clicked in header |
| Tag suggestions | None | 5 tags per rating level as toggle pills |
| After submission | Dialog closes, sidebar closes | Stars in header turn read-only + tooltip |
| Exit guard | None on full page | One-time soft nudge when navigating away |
| Permission check | Required `EDIT_SCENARIO_SESSION` | Removed, controlled by `canShowFeedback` prop |
| Old rating shown on reload | Not possible | Stars show old rating (via sessionFeedback) |
