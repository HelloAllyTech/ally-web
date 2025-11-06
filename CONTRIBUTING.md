# Contributing Guidelines

Thank you for your interest in contributing! This guide explains how to work in this monorepo and contribute changes to this repository.

## Quick start

1. Clone and install

```bash
git clone <repo-url>
cd ally-UI
npm install
```

## Branching strategy

Name branches as: `<type>/<short-description-in-kebab-case>`

Allowed types:

| type     | description                  |
| -------- | ---------------------------- |
| feat     | Add a new feature            |
| fix      | Bug fix                      |
| chore    | Maintenance or configuration |
| refactor | Non-behavioral refactor      |
| doc      | Documentation updates        |
| test     | Add or update tests          |

Examples:

```text
feat/add-user-authentication
fix/login-redirect-bug
```

## Commit messages (Conventional Commits)

Format: `<type>: <short_description>`

Examples:

```text
feat: add dark mode toggle
fix: correct typo in error message
chore: update eslint config
refactor: simplify data fetching logic
```

Rules:

- Use imperative mood (“add”, not “added”).
- Max 72 chars for the subject line.
- Add details in a body paragraph if needed (blank line after subject).
- Reference issues/PRs when applicable (e.g., “Closes #42”).

## Pull Requests

Before submitting a PR:

1. Update your branch with dev:

```bash
git fetch origin
git rebase origin/dev
```

2. Verify quality and tests:

```bash
npm run lint
npm run test
```

3. Checklist:

- Keep PRs focused (avoid unrelated changes).
- Add/update tests for your changes.
- Update documentation if functionality changes.
- Use a clear title and description; link issues with keywords (e.g., “Closes #101”).

PRs are reviewed for code quality, guideline adherence, test coverage, and docs.

## Code style & quality

- Run ESLint before committing: `npm run lint`
- Format with Prettier: `npm run format`
- Prefer clear, descriptive names and small, focused modules.
- Avoid large PRs—prefer small, incremental changes.

## Testing

- All changes should include unit and/or integration test coverage.
- Run tests: `npm run test`
- Add tests for new features and bug fixes.
- Ensure the existing test suite passes before submitting.

❤️ Thank you for contributing! Your time and effort make this project better for everyone.
