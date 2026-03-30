# Production Release Guide - ally Web Services

This guide explains how to create production releases for all ally Web services using automated release pipelines with semantic versioning and release drafts.

## Table of Contents

- [Overview](#overview)
- [Services](#services)
- [Quick Start](#quick-start)
- [Semantic Versioning](#semantic-versioning)
- [Release Process](#release-process)
- [Service-Specific Details](#service-specific-details)
- [Troubleshooting](#troubleshooting)

---

## Overview

The ally-web repository contains three production services, each with its own release pipeline:

1. **ally Web** - Main web application (ECS deployment)
2. **Admin Dashboard** - Administration interface (CDN deployment)
3. **Helpline Dashboard** - Helpline management interface (CDN deployment)

Each service has an independent release pipeline with:

- Semantic versioning (Major.Minor.Patch)
- Automated testing
- Production deployment
- Automatic release draft creation
- Auto-generated changelogs

---

## Services

### 1. ally Web (ECS Service)

- **Pipeline**: `production-release-web.yaml`
- **Deployment**: ECS (Docker container)
- **App Path**: `apps/ally-web`
- **Runtime**: Node.js 20
- **Port**: 3000

### 2. Admin Dashboard (CDN)

- **Pipeline**: `production-release-admin-dashboard.yaml`
- **Deployment**: S3 + CloudFront
- **App Path**: `apps/ally-admin-dashboard`
- **Build Tool**: Nx
- **Type**: Static site

### 3. Helpline Dashboard (CDN)

- **Pipeline**: `production-release-helpline-dashboard.yaml`
- **Deployment**: S3 + CloudFront
- **App Path**: `apps/ally-helpline-dashboard`
- **Build Tool**: npm (standalone)
- **Type**: Static site

---

## Quick Start

### Prerequisites

- All changes merged to **master** branch
- Tests passing locally or in CI
- Code review completed
- Production secrets configured

### How to Release (Any Service)

1. **Go to GitHub Actions**
   - Navigate to: `https://github.com/your-org/ally-web/actions`
2. **Select the Appropriate Workflow**
   - **ally Web**: "Production Release - ally Web"
   - **Admin Dashboard**: "Production Release - Admin Dashboard"
   - **Helpline Dashboard**: "Production Release - Helpline Dashboard"

3. **Trigger the Workflow**
   - Click **"Run workflow"** button (top right)
   - Select branch: **master**
   - Enter version tag: `v1.2.3` (format: `vMAJOR.MINOR.PATCH`)
   - Click **"Run workflow"**

4. **Monitor Deployment**
   - Watch the pipeline execute automatically
   - All jobs must complete successfully

5. **Publish Release**
   - Go to **GitHub Releases**
   - Find the draft release for your service
   - Review and edit changelog
   - Click **"Publish release"**

---

## Semantic Versioning

We follow [Semantic Versioning 2.0.0](https://semver.org/): `vMAJOR.MINOR.PATCH`

### Version Types

**MAJOR (X.0.0)** - Breaking Changes

- Incompatible API changes
- Major UI redesign
- Breaking changes for users
- Example: `v1.5.3` → `v2.0.0`

**MINOR (0.X.0)** - New Features

- New features (backward compatible)
- New pages or functionality
- Enhancements
- Example: `v1.5.3` → `v1.6.0`

**PATCH (0.0.X)** - Bug Fixes

- Bug fixes only
- Performance improvements
- Security patches
- UI tweaks
- Example: `v1.5.3` → `v1.5.4`

### Independent Versioning

**Each service has its own version number!**

- ally Web can be at `v2.1.0`
- Admin Dashboard can be at `v1.5.2`
- Helpline Dashboard can be at `v1.3.1`

Versions are independent because services are deployed separately.

---

## Release Process

### Step 1: Determine Version Number

```bash
# Check current version for the specific service
git tag -l "v*" --sort=-v:refname | head -1

# View changes since last release
git log v1.2.3..master --oneline -- apps/ally-web  # or other service path

# Decide version bump based on changes
```

### Step 2: Trigger Release Workflow

1. Go to GitHub Actions
2. Select the appropriate workflow for your service
3. Click "Run workflow"
4. Fill in:
   - **Branch**: `master`
   - **Version tag**: `v1.2.3`
5. Click "Run workflow"

### Step 3: Monitor Pipeline

The workflows run these jobs:

**Common Jobs (All Services):**

1. ✅ **Validate Version and Create Tag**
   - Validates tag format
   - Checks tag doesn't exist
   - Ensures version is newer than latest
   - Creates and pushes git tag

2. ✅ **Prepare Production Environment**
   - Sets AWS credentials
   - Configures service variables

3. ✅ **Run Tests**
   - Runs service-specific tests
   - Runs shared library tests

**Service-Specific Jobs:**

**ally Web (ECS):** 4. ✅ Build Docker image with multiple version tags 5. ✅ Deploy to ECS 6. ✅ Create release draft

**Dashboards (CDN):** 4. ✅ Build static assets 5. ✅ Upload to S3 6. ✅ Invalidate CloudFront cache 7. ✅ Create release draft

---

## Service-Specific Details

### ally Web (ECS Service)

**Build Process:**

- Builds Docker image from `apps/ally-web`
- Downloads build-time environment variables from S3
- Creates multiple image tags:
  - `1.2.3` - Exact version
  - `1.2` - Major.Minor
  - `1` - Major only
  - `latest` - Latest release

**Deployment:**

- Updates ECS task definition
- Deploys to production ECS service
- Waits for service stability

**Required Variables:**

```
PRD_AWS_ROLE
PRD_AWS_REGION
PRD_ECR_REPOSITORY
```

**Test Command:**

```bash
npm run test:web
npm run test:ui-shared
```

---

### Admin Dashboard (CDN)

**Build Process:**

- Builds using Nx: `npx nx build ally-admin-dashboard`
- Downloads build-time environment variables from S3
- Output: `dist/apps/ally-admin-dashboard/`

**Deployment:**

- Syncs built files to S3
- Configures Content-Type for `.well-known` files
- Invalidates CloudFront cache

**Required Variables:**

```
PRD_AWS_ROLE
PRD_AWS_REGION
PRD_ADMIN_DASHBOARD_DISTRIBUTION_ID
PRD_ADMIN_DASHBOARD_S3_BUCKET
```

**Test Command:**

```bash
npx nx test ally-admin-dashboard --coverage
```

---

### Helpline Dashboard (CDN)

**Build Process:**

- Builds using npm: `npm run build` (in app directory)
- Downloads build-time environment variables from S3
- Output: `apps/ally-helpline-dashboard/dist/`

**Deployment:**

- Syncs built files to S3
- Configures Content-Type for `.well-known` files
- Invalidates CloudFront cache

**Required Variables:**

```
PRD_AWS_ROLE
PRD_AWS_REGION
PRD_DASHBOARD_DISTRIBUTION_ID
PRD_DASHBOARD_S3_BUCKET
```

**Test Command:**

```bash
npm run test:helpline
npm run test:ui-shared
```

---

## Troubleshooting

### Tag Already Exists

**Error**: "Tag v1.2.3 already exists"

**Solution**:

- Choose a different version number
- Or delete the existing tag:
  ```bash
  git tag -d v1.2.3
  git push origin :refs/tags/v1.2.3
  ```

### Version Not Newer

**Error**: "Tag v1.2.0 is not newer than the latest tag v1.5.0"

**Solution**: Use a higher version number

```bash
# Check current latest tag
git tag -l "v*" --sort=-v:refname | head -1

# ✅ Correct: v1.5.1, v1.6.0, v2.0.0
# ❌ Wrong: v1.4.0, v1.0.0, v1.5.0
```

### Tests Fail

**Error**: Test job fails

**Solution**:

1. Run tests locally:

   ```bash
   # For ally Web
   npm run test:web

   # For Admin Dashboard
   npx nx test ally-admin-dashboard

   # For Helpline Dashboard
   npm run test:helpline
   ```

2. Fix failing tests
3. Commit and push to master
4. Delete tag if created: `git push origin :refs/tags/v1.2.3`
5. Re-run workflow

### ECS Deployment Fails (ally Web Only)

**Error**: ECS deployment fails

**Solution**:

1. Check AWS credentials (`PRD_AWS_ROLE`, `PRD_AWS_REGION`)
2. Verify ECS resources exist
3. Check CloudWatch logs
4. Review task definition compatibility

### CDN Deployment Fails (Dashboards Only)

**Error**: S3 sync or CloudFront invalidation fails

**Solution**:

1. Check AWS credentials
2. Verify S3 bucket exists and has correct permissions
3. Verify CloudFront distribution ID is correct
4. Check build output exists in expected directory

### Build Fails

**Error**: Build job fails

**Common Issues:**

**ally Web:**

- Docker build errors
- Missing dependencies
- Environment variables not accessible

**Admin Dashboard:**

- Nx build errors
- Missing dependencies
- TypeScript errors

**Helpline Dashboard:**

- npm build errors
- Missing dependencies
- Build script issues

**Debug Locally:**

```bash
# For ally Web (Docker)
cd apps/ally-web
docker build -t test .

# For Admin Dashboard (Nx)
npx nx build ally-admin-dashboard

# For Helpline Dashboard (npm)
cd apps/ally-helpline-dashboard
npm run build
```

---

## Best Practices

### Before Release

- ✅ Test in development environment
- ✅ Run full test suite locally
- ✅ Review all PRs merged since last release
- ✅ Update service-specific documentation
- ✅ Prepare release notes

### Version Selection

- ✅ Version each service independently
- ✅ Use MAJOR for breaking changes
- ✅ Use MINOR for new features
- ✅ Use PATCH for bug fixes
- ✅ Document changes clearly

### Release Frequency

- ✅ Release regularly
- ✅ Don't batch too many changes
- ✅ Quick patches for critical bugs
- ✅ Coordinate related services if needed

### Post-Release

- ✅ Monitor application logs
- ✅ Check error rates
- ✅ Verify functionality
- ✅ Update documentation
- ✅ Communicate to team/users

---

## Configuration

### Required GitHub Variables

**Common (All Services):**

```
PRD_AWS_ROLE          # AWS IAM role for production
PRD_AWS_REGION        # AWS region
```

**ally Web Only:**

```
PRD_ECR_REPOSITORY    # ECR repository URL
```

**Admin Dashboard Only:**

```
PRD_ADMIN_DASHBOARD_DISTRIBUTION_ID
PRD_ADMIN_DASHBOARD_S3_BUCKET
```

**Helpline Dashboard Only:**

```
PRD_DASHBOARD_DISTRIBUTION_ID
PRD_DASHBOARD_S3_BUCKET
```

---

## Quick Reference

### Workflows

| Service            | Workflow File                                | Deployment Type |
| ------------------ | -------------------------------------------- | --------------- |
| ally Web           | `production-release-web.yaml`                | ECS             |
| Admin Dashboard    | `production-release-admin-dashboard.yaml`    | CDN             |
| Helpline Dashboard | `production-release-helpline-dashboard.yaml` | CDN             |

### Build Commands

| Service            | Command                             |
| ------------------ | ----------------------------------- |
| ally Web           | Docker build                        |
| Admin Dashboard    | `npx nx build ally-admin-dashboard` |
| Helpline Dashboard | `npm run build` (in app dir)        |

### Test Commands

| Service            | Command                            |
| ------------------ | ---------------------------------- |
| ally Web           | `npm run test:web`                 |
| Admin Dashboard    | `npx nx test ally-admin-dashboard` |
| Helpline Dashboard | `npm run test:helpline`            |

---

## Support

For issues with the release pipeline:

1. **Check Logs**
   - GitHub Actions workflow logs
   - AWS CloudWatch logs (ECS)
   - CloudFront logs (CDN)

2. **Review This Guide**
   - Follow troubleshooting steps
   - Verify configuration

3. **Contact Team**
   - DevOps team for infrastructure issues
   - Frontend team for application issues

4. **Open Issue**
   - Create issue in repository
   - Include error logs and steps to reproduce
   - Tag with service name
