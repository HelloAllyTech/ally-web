# UX/UI Audit — Ally Web Monorepo

**Date:** June 2026
**Scope:** `apps/ally-web` (Next.js 14 resource search), `apps/ally-helpline-dashboard` (Vite + React counselor app), `apps/ally-admin-dashboard` (Vite + React), `libs/ui-shared`.
**Method:** Static code review against UX heuristics: error handling and recovery, loading and empty states, action feedback, accessibility (WCAG 2.1 AA), internationalisation, responsiveness, and design consistency.

Each finding is marked **Fixed** (addressed by the quick-wins change set accompanying this document) or **Recommended** (future work).

---

## What's already done well

- **ally-web**: skeleton loaders that match the real layout (`src/app/loading.tsx`, ui-shared `SkeletonLoader`), debounced infinite scroll, lazy-loaded images with fallback (`CustomImage`), font loading with `display: swap`.
- **Helpline dashboard**: strong call-lifecycle UX — animated connection status, `ErrorScreen` with actionable retry/back options, wake-lock management with reacquisition on tab focus, privacy tooltips, socket reconnection with bounded retries, confirmation dialogs for all destructive actions (no `window.confirm`), sonner toasts, i18next with 5 locales and versioned dynamic loading plus the `scripts/i18n-sync.mjs` workflow.
- **Admin dashboard**: well-structured Tailwind design tokens (`tailwind.config.js` — primary/secondary/success/destructive/warning/neutral/typography scales), checkbox-confirmed destructive deletes (`DeletePopup`), dedicated `EmptyState` component with CTA, react-hook-form inline validation, RTK Query caching with tag invalidation, table skeleton loaders.
- **Repo-wide**: consistent `data-testid` discipline, TypeScript throughout, vitest + Testing Library coverage.

---

## Cross-cutting themes

| #   | Theme                                                                                      | Severity |
| --- | ------------------------------------------------------------------------------------------ | -------- |
| 1   | Errors are swallowed or shown without recovery affordances; no React error boundaries      | Critical |
| 2   | Accessibility: clickable non-interactive elements, missing accessible names, sparse ARIA   | High     |
| 3   | i18n inconsistency: hardcoded strings in i18n-enabled code; admin app English-only         | High     |
| 4   | Design-token leakage: hardcoded hex colors despite token palettes; no shared design system | Medium   |
| 5   | Component duplication between apps and `ui-shared`                                         | Medium   |
| 6   | Loading/empty-state gaps on incremental fetches and filtered views                         | Medium   |

---

## Per-app findings

### ally-web (landing page / resource search)

| Finding                                                                                                                                         | Refs                                                      | Severity | Status                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| Server fetch errors render a bare `<div>Error loading search results.</div>` with no styling or retry, and are logged at `info` level           | `src/app/page.tsx:31-34`                                  | Critical | **Fixed** — styled `ErrorState` with retry (`router.refresh()`), `logger.error`                           |
| Route error boundary ignores Next.js `reset` prop; minimal "Something went wrong!" with no recovery                                             | `src/app/error.tsx`                                       | Critical | **Fixed** — styled fallback with "Try again" wired to `reset()`                                           |
| No `not-found.tsx`; unknown routes get the default unstyled 404                                                                                 | `src/app/`                                                | High     | **Fixed** — branded 404 with link home                                                                    |
| Infinite-scroll failures are silently swallowed; the spinner disappears and the user gets no feedback                                           | `src/app/components/search-client/SearchClient.tsx:74-76` | High     | **Fixed** — error logged at `error` level and surfaced via sonner toast (Toaster mounted in `layout.tsx`) |
| No semantic heading structure; titles rendered as `<span>`/`<div>`                                                                              | ui-shared `resource-card/ResourceCard.tsx`                | High     | **Fixed** (card title → `<h3>`); broader heading hierarchy **Recommended**                                |
| Hardcoded user-facing strings despite components accepting label props ("View more", "Loading resources...", "Try:")                            | ui-shared components, `loading.tsx`                       | Medium   | Recommended — adopt an i18n layer for ally-web                                                            |
| No central theme; hardcoded hex colors (`#ADADAD`, `#DADCE1`) and arbitrary spacing (`h-[calc(100vh-10px)]`) scattered through Tailwind classes | `libs/ui-shared/src/lib/*/constants.ts`, various          | Medium   | Recommended — design tokens (see roadmap)                                                                 |
| Raw `<img>` instead of `next/image`; no virtualization for long result lists                                                                    | `CustomImage`, `SearchClient`                             | Low      | Recommended                                                                                               |

### ally-helpline-dashboard (counselor app)

| Finding                                                                                                                                                                                                                                            | Refs                                                                              | Severity | Status                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No React error boundary; a render crash blanks the whole app                                                                                                                                                                                       | `src/App.tsx`                                                                     | Critical | **Fixed** — shared `ErrorBoundary` from `ui-shared` wraps `RouteLayout`                                                                                                      |
| Hardcoded English toast in an i18n app (5 locales): "You've joined an active call…"                                                                                                                                                                | `src/pages/audio-call/hooks/useMicrophoneMode.ts:440-442`                         | High     | **Fixed** — `t("audioCall.joinedActiveCall")`, key added to all locales (non-English currently English fallback; rerun `i18n-sync` with an OpenAI key for real translations) |
| "Load More" on the call-logs table shows no loading feedback: `GenericTable` supports a spinner but receives the initial-load flag only; `isLoadingMore` is tracked but never rendered, and is never reset when a page returns empty (stuck state) | `src/pages/calls/components/UserLogsTable.tsx`                                    | High     | **Fixed** — pass `isLoading \|\| isLoadingMore` to the table; reset `isLoadingMore`/`hasMore` on empty page                                                                  |
| Sparse ARIA (~15 attributes across pages); click handlers on `<span>`/`<div>`/bare icons (e.g. Login links, `X` close icons)                                                                                                                       | `src/pages/auth/Login.tsx:312,390`, `audio-call/components/CallInterface.tsx:117` | High     | Recommended — systematic a11y pass (axe DevTools), convert to `<button>`                                                                                                     |
| Silent catches: errors logged but not surfaced to the user                                                                                                                                                                                         | `useMicrophoneMode.ts:214` and similar                                            | High     | Recommended — audit catch blocks; surface via toast/ErrorScreen                                                                                                              |
| Errors frequently logged via `logger.info` instead of `logger.error`                                                                                                                                                                               | multiple call sites                                                               | Medium   | Recommended — sweep                                                                                                                                                          |
| Hardcoded hex colors instead of theme tokens (`bg-[#17181A]`, `bg-[#EEF8FF]`, `border-[#0171D9]`)                                                                                                                                                  | `StressBuster.tsx`, `CallInterface.tsx`, others                                   | Medium   | Recommended                                                                                                                                                                  |
| No socket "reconnecting…" indicator (user can't distinguish reconnection from failure); no visual mute indicator beyond button state                                                                                                               | `useSocket.ts`, call UI                                                           | Medium   | Recommended                                                                                                                                                                  |
| Tables not virtualized; deep pagination loads all fetched rows into the DOM                                                                                                                                                                        | `UserLogsTable.tsx`                                                               | Medium   | Recommended                                                                                                                                                                  |
| Minimal form validation (email regex only, OTP length-only); no real-time feedback                                                                                                                                                                 | `Login.tsx`                                                                       | Medium   | Recommended                                                                                                                                                                  |
| Few skeleton loaders (2); data-heavy pages flash blank before content                                                                                                                                                                              | pages/                                                                            | Low      | Recommended                                                                                                                                                                  |
| No "no results match your filters" empty-state variant                                                                                                                                                                                             | `FallbackUI` usage                                                                | Low      | Recommended                                                                                                                                                                  |

### ally-admin-dashboard

| Finding                                                                                             | Refs                                                                                                           | Severity | Status                                                                                                            |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| No React error boundary                                                                             | `src/App.tsx`                                                                                                  | Critical | **Fixed** — shared `ErrorBoundary` wraps `RouteLayout` (Toaster/LogViewer kept outside so toasts survive a crash) |
| Icon-only close buttons with no accessible name in modals                                           | `components/delete-popup/DeletePopup.tsx:37-42`, `action-confirmation-popup/ActionConfirmationPopup.tsx:63-68` | High     | **Fixed** — `aria-label` from `en.common.close`, `type="button"`                                                  |
| Custom modals lack focus trap and Escape-to-close                                                   | DeletePopup, ActionConfirmationPopup                                                                           | High     | Recommended — or migrate to MUI `Dialog` which provides both                                                      |
| English-only via 2000-line `constants/en.ts`; not on i18next; `i18n-sync` only covers helpline      | `src/constants/en.ts`, `scripts/i18n-sync.mjs`                                                                 | Medium   | Recommended — migrate to i18next if multi-language admin is ever needed                                           |
| Component duplication with `ui-shared`: DropdownField, Toggle, tables (NotionTable vs GenericTable) | `src/components/*` vs `libs/ui-shared`                                                                         | Medium   | Recommended — make ui-shared components optionally form-aware (react-hook-form)                                   |
| Hardcoded strings bypassing `en.ts` (e.g. `` `${label} is required` ``)                             | `components/input-field/InputField.tsx:86`                                                                     | Medium   | Recommended                                                                                                       |
| No dark mode (`darkMode` not configured) despite helpline supporting themes                         | `tailwind.config.js`                                                                                           | Low      | Recommended                                                                                                       |
| Mixed icon/UI libraries (Lucide + custom SVG + MUI icons; Tailwind + MUI + Carbon charts)           | various                                                                                                        | Low      | Recommended — standardise on Lucide + one component approach                                                      |

### libs/ui-shared

| Finding                                                                                                     | Refs                                                     | Severity | Status                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ResourceCard` is a clickable `<div>` with no keyboard access, role, or expanded state; title is a `<span>` | `src/lib/resource-card/ResourceCard.tsx:190-208`         | High     | **Fixed** — `role="button"`, `tabIndex`, `aria-expanded`, Enter/Space handling; title → `<h3>`. Note: a real `<button>` wrapper (removing the nested interactive control) is the proper long-term fix — **Recommended**                          |
| Search Autocomplete has no accessible label and ships a copy-pasted demo id (`free-solo-2-demo`)            | `src/lib/resource-search-bar/ResourceSearchBar.tsx`      | High     | **Fixed** — `aria-label`, id renamed `resource-search-autocomplete`                                                                                                                                                                              |
| Suggestion buttons missing `type="button"`; decorative icons not hidden from screen readers                 | `src/lib/suggestions-container/SuggestionsContainer.tsx` | Medium   | **Fixed**                                                                                                                                                                                                                                        |
| `Badge` hardcodes hex colors (`#FDFDFD`, `#616161`, `#D5D9EB`)                                              | `src/lib/badge/Badge.tsx:22-31`                          | Medium   | Recommended — deliberately not changed now: the hexes are theme-independent and ui-shared is consumed by three apps with different Tailwind configs; tokenizing requires aligning token names across all consumers plus visual regression checks |
| No README/usage docs for the component library                                                              | `libs/ui-shared/`                                        | Low      | Recommended — component docs or Storybook                                                                                                                                                                                                        |

---

## Prioritized roadmap

### Critical — addressed in this change set

1. Error boundaries at app root (helpline, admin) via new shared `ErrorBoundary`.
2. ally-web error UX: styled error states with retry, `not-found.tsx`, surfaced infinite-scroll failures, `logger.error` for errors.

### High — partially addressed; remainder recommended

3. Accessibility: interactive-element semantics and accessible names (ResourceCard, search bar, admin modal close buttons fixed; full axe-driven sweep of helpline/admin remaining).
4. i18n hygiene: untranslated helpline toast fixed; remaining work — real translations via `i18n-sync` with an API key, ally-web i18n layer, hardcoded-string sweep.

### Medium — recommended next

5. Design tokens: replace hardcoded hex colors with theme tokens app-by-app; decide a shared token strategy for ui-shared (prerequisite for Badge et al.).
6. Modal accessibility in admin (focus trap, Escape) or migration to MUI Dialog.
7. Sweep `logger.info`-on-error call sites; surface silently-caught errors.
8. Component dedup: form-aware ui-shared variants to replace admin's parallel DropdownField/Toggle/table implementations.
9. Socket reconnection indicator and mute-state visibility in helpline calls.

### Longer-term

10. Table virtualization for large datasets (helpline call logs).
11. Dark mode for admin; unified cross-app design system documentation.
12. Form validation UX: real-time feedback, consistent error messaging standards.
13. Component library documentation (README per component or Storybook).
