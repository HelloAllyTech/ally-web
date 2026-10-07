# Mobile UX guidelines

How every screen in both apps should behave on a phone. Baseline viewport **375×812**; also check
**320px** (small Android, iPhone SE with larger text) and make sure **768px** still looks right.
Desktop (≥ `lg`) is the layout most screens were designed at — phone fixes must leave it unchanged.

Tailwind 3.4 with default breakpoints (`sm` 640, `md` 768, `lg` 1024, `xl` 1280; `max-sm:` /
`max-md:` variants available). Note the custom type scale: `text-sm` is 13px, `text-base` 14px,
`text-lg` 16px, `text-2xl` 24px, `text-4xl` 32px.

## Already handled for you

- **App shells.** Below `md` both apps show a 56px top bar with a menu button, and the nav is an
  off-canvas drawer (closes on Escape and on navigation). The page region under the bar is
  `flex-1 min-h-0`, so a page can use `h-full`. The admin shell already pads pages `p-4 lg:p-6` —
  don't add a second gutter.
- **Global touch baseline** (`apps/*/src/index.css`, `styles.css`): fields are 16px on touch
  devices so iOS doesn't zoom into them; controls skip the double-tap delay; Carbon notifications
  are fluid on phones; the viewport uses `interactive-widget=resizes-content`, so the on-screen
  keyboard shrinks `dvh` instead of covering a bottom composer.
- **Shared components.** `SidePanel` is full-screen below `sm`; Carbon `Modal`/`ComposedModal` are
  full-screen below 672px; `Pagination` and `GenericTable` are phone-ready; `OTP` fits and accepts
  a pasted code.

## Rules

1. **Mobile-first, desktop preserved.** Put the phone value in the base class and restore today's
   value where the desktop layout starts: `p-4 md:p-10`, `flex-col md:flex-row`,
   `w-full md:w-[480px]`. Re-read the ≥ `lg` result of every class you touch.
2. **No sideways page scroll** at 320–414px. Only deliberate scrollers (data tables, tab strips,
   boards, code blocks) scroll horizontally, each inside its own `overflow-x-auto` box. Watch for
   fixed widths (`w-[600px]`, `min-w-[…]`), fixed `grid-cols-N`, `whitespace-nowrap` rows,
   right-anchored popovers, and unbroken strings — use `min-w-0` on flex children, `break-words`
   for prose, `break-all` for IDs/emails, `max-w-[calc(100vw-2rem)]` on popovers.
3. **One pane at a time.** List + detail, content + side rail, editor + preview: stack them or show
   one pane below `md`/`lg`, with a clear way back. Nothing essential may be `hidden` below a
   breakpoint without another way to reach it.
4. **Heights:** `h-dvh`/`min-h-dvh`, never `h-screen`/`100vh` (iOS URL bar, keyboard). Inside the
   app shells prefer `h-full`/`min-h-full` — `min-h-dvh` under the 56px top bar adds a pointless
   scroll.
5. **Touch targets ≥ 44×44px** (≥ 40px in dense rows, never under 24px), ≥ 8px apart. Icon-only
   buttons get padding to reach the size and an `aria-label`. Clickable `div`/`span`/`svg` → a real
   `<button type="button">`.
6. **No hover-only affordances.** `opacity-0 group-hover:opacity-100` actions must be visible on
   touch (`opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100`).
   Information that lives only in a tooltip must also be reachable by tap.
7. **Typography:** page titles scale (`text-2xl md:text-4xl`); nothing under 12px for real content.
8. **Forms:** full-width fields, rows stack (`flex-col sm:flex-row`), right keyboards (`type="email"`
   - `autoComplete="email"`, `inputMode="numeric"`, `enterKeyHint="search"`), primary action
     `w-full sm:w-auto`, action rows `flex-col-reverse sm:flex-row` (primary on top).
9. **Chat screens:** the composer stays in view with the keyboard up (bounded `dvh` layout, the
   message list is the only scroller), bubbles `max-w-[85%]` with `break-words`, send button ≥ 44px.
10. **Drag-and-drop** must not hijack scrolling: with dnd-kit use `MouseSensor` (distance) +
    `TouchSensor` (`delay: 250, tolerance: 5`), not a bare `PointerSensor`.
11. **Prefer CSS to JS** for layout. When a component must know (e.g. to mount one of two layouts),
    guard `window.matchMedia` — tests mock it to `matches: false`, i.e. desktop.
12. **States count too.** Loading, empty and error states need the same care: centred, padded, no
    overflow, buttons reachable.

## Checking your screen

Chrome DevTools device mode at 375 and 320 is enough for most changes: scroll sideways (nothing
should move), open every drawer/modal/menu, focus a field near the bottom, tab through with a
keyboard. For a quick overflow check in the console:

```js
[...document.querySelectorAll("body *")].filter(
  el => el.getBoundingClientRect().right > innerWidth + 1,
);
```
