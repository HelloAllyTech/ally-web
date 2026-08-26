# Release Guide — ally-web

**The shared release process lives in the wiki:
[Release Process](https://tech.helloally.ai/#/wiki/contributing/release-process.md).**
Read that for semantic-versioning policy, how to trigger a workflow, the image tag scheme,
publishing the draft, and general troubleshooting. This file carries what is specific to
this repo — and this repo is the one that differs most: **three services, released
independently.**

## Two services, two pipelines, two version series

Each service versions on its own. The Admin Dashboard at `v1.4.0` says nothing about what
version the Helpline Dashboard is on. Always confirm which service you are releasing
before picking a number.

| # | Service | Pipeline | Deploys to | App path | Build |
|---|---|---|---|---|---|
| 1 | Admin Dashboard | `production-release-admin-dashboard.yaml` | S3 + CloudFront | `apps/ally-admin-dashboard` | Nx → `dist/apps/ally-admin-dashboard/` |
| 2 | Helpline Dashboard | `production-release-helpline-dashboard.yaml` | S3 + CloudFront | `apps/ally-helpline-dashboard` | npm → `apps/ally-helpline-dashboard/dist/` |

Runtime in CI is **Node.js 20** for both. Both download build-time environment
variables from S3 during the build.

## 1 — Admin Dashboard (CDN)

Builds with `npx nx build ally-admin-dashboard`, syncs to S3, sets Content-Type for
`.well-known` files, invalidates CloudFront.

```bash
npx nx test ally-admin-dashboard --coverage
```

Required variables: `PRD_AWS_ROLE`, `PRD_AWS_REGION`,
`PRD_ADMIN_DASHBOARD_DISTRIBUTION_ID`, `PRD_ADMIN_DASHBOARD_S3_BUCKET`

## 2 — Helpline Dashboard (CDN)

Builds with `npm run build` in the app directory, syncs to S3, sets Content-Type for
`.well-known` files, invalidates CloudFront.

```bash
npm run test:helpline
npm run test:ui-shared
```

Required variables: `PRD_AWS_ROLE`, `PRD_AWS_REGION`,
`PRD_DASHBOARD_DISTRIBUTION_ID`, `PRD_DASHBOARD_S3_BUCKET`

## Notes specific to this repo

- **A `libs/ui-shared` change ships in all three.** Releasing one service with a shared-lib
  change means the other two are running different component code until they release too.
  Coordinate, or release all three.
- **CDN releases need a cache invalidation to be visible.** If the deploy succeeded and you
  still see the old build, check the CloudFront invalidation before re-releasing.
- CI and deployment workflow details: [`WORKFLOWS.md`](WORKFLOWS.md).
