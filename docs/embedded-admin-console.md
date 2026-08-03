# The admin console at `/admin` on the consumer app

The super-admin console (`apps/ally-admin-dashboard`) ships to **two** places from
one codebase:

| Surface        | Mount point                             | Who signs in                                             |
| -------------- | --------------------------------------- | -------------------------------------------------------- |
| **standalone** | `/` on the admin dashboard's own origin | `SUPER_ADMIN`, `SUPER_DUPER_ADMIN`, `MULTI_TENANT_ADMIN` |
| **embedded**   | `/admin` on the consumer app's origin   | the three above **plus** `INTERNAL`                      |

`INTERNAL` is Ally staff. The backend grants it a permission-for-permission
clone of `SUPER_ADMIN`, so the console behaves identically — the point of the
role is that staff reach it from the app they already use, and never appear in
(or are managed by) the super-admin management screens.

## Building each surface

One knob: the Vite `base` option, set from `VITE_ADMIN_BASE_PATH`.

```bash
npm run build:admin            # standalone — base "/"
npm run build:admin:embedded   # embedded  — base "/admin/"
```

Everything else follows from it. Vite echoes the value back as
`import.meta.env.BASE_URL`, which `src/constants/surface.ts` turns into the
router basename, the prefix for hand-built URLs, and the answer to "is this the
embedded surface?". Because the mount point and the app's idea of the mount
point come from the same value, they cannot drift.

## What the deployment has to do

**This part lives outside this repo.** Publishing the embedded bundle needs a
path route on the consumer app's distribution:

1. Build with `npm run build:admin:embedded` and publish the output to its own
   prefix (e.g. an `admin/` key prefix in the consumer app's bucket, or a second
   origin).
2. Route `"/admin"` and `"/admin/*"` on the consumer origin to that bundle,
   ahead of the consumer app's own catch-all.
3. Serve `/admin/index.html` for any unmatched path **under `/admin`** — it is a
   client-side-routed SPA, so `/admin/user-management` must return the admin
   `index.html`, not the consumer app's, and not a 404. Keep the consumer app's
   own SPA fallback for everything outside `/admin`.
4. Do not strip the `/admin` prefix when forwarding: assets are emitted as
   `/admin/assets/...` and are requested at that path.

Until that routing exists, `build:admin:embedded` produces a correct bundle
that simply has nowhere to be served from; the standalone dashboard is
unaffected.

## Sessions

The two apps share an origin, and therefore a `localStorage`, but keep separate
keys — the consumer app uses `accessToken` / `refreshToken`, the console uses
`adminAccessToken` / `adminRefreshToken`. Both sessions coexist.

On startup the embedded console calls `adoptConsumerSession()`
(`src/utils/consumerSession.ts`): if there is no admin session but the consumer
app has one, it copies the tokens across so arriving from the app does not mean
signing in twice. It is a copy, not a shared key — the console refreshes and
clears its own tokens independently. An existing admin session is never
overwritten, and the whole thing no-ops on the standalone surface.

Because _any_ signed-in consumer user has a session to adopt, `PrivateLayout`
carries a whole-console gate: a user whose role is not one this surface serves
gets `AccessDenied` rather than an empty console shell full of 403s.

## Caveat: the login role split is a convention, not a boundary

Each client tells the backend which roles it will accept, in the `allowedRoles`
field of the login request, and the backend checks the caller against the list
it was given. Sending the standalone list from a client would therefore let an
`INTERNAL` holder in at the standalone dashboard.

That is not a privilege escalation — `INTERNAL` and `SUPER_ADMIN` carry
identical permissions, so the same person gets the same API access either way.
It does mean "INTERNAL only signs in via `/admin`" is a routing decision rather
than something enforced server-side. Closing it properly would mean deriving
`allowedRoles` from a trusted signal instead of the request body, which changes
how every client authenticates.
