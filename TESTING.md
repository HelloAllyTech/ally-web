# Testing in Docker

This project supports running tests in isolated Docker containers for clean, reproducible test runs.

## Overview

We provide two approaches for running tests:

### 1. **Ephemeral Test Containers (Recommended)**

- Tests run in fresh, isolated containers
- Clean state for each test run
- Matches CI/CD pipeline behavior
- Best for pre-commit, CI, and official test runs

### 2. **Dev Container Testing (Fast Iteration)**

- Tests run in existing development containers
- Very fast for TDD workflow
- Good for quick iteration during development

---

## Quick Start

### Run All Tests (Recommended)

```bash
npm run test:docker
# or
./test-docker.sh all
```

### Run Specific Tests

```bash
npm run test:docker:admin        # Test ally-admin-dashboard
npm run test:docker:helpline     # Test ally-helpline-dashboard
npm run test:docker:ui-shared    # Test ui-shared library
```

### Watch Mode (Fast Development)

```bash
npm run test:docker:watch
```

This runs tests in watch mode using your running dev containers for fast feedback.

### Generate Coverage Report

```bash
npm run test:docker:coverage
```

Coverage reports are saved to `./coverage` directory.

### Clean Up Test Resources

```bash
npm run test:docker:clean
```

---

## Available Commands

### NPM Scripts

| Command                         | Description                                   |
| ------------------------------- | --------------------------------------------- |
| `npm run test:docker`           | Run all tests in isolated containers          |
| `npm run test:docker:admin`     | Run only admin dashboard tests                |
| `npm run test:docker:helpline`  | Run only helpline dashboard tests             |
| `npm run test:docker:ui-shared` | Run only ui-shared library tests              |
| `npm run test:docker:watch`     | Run tests in watch mode (uses dev containers) |
| `npm run test:docker:coverage`  | Generate coverage reports                     |
| `npm run test:docker:clean`     | Clean up test containers and volumes          |

### Direct Script Usage

```bash
./test-docker.sh [command]
```

Available commands:

- `all` - Run all tests
- `admin` - Run admin tests
- `helpline` - Run helpline tests
- `ui-shared` - Run ui-shared tests
- `watch` - Watch mode for fast iteration
- `coverage` - Generate coverage reports
- `clean` - Clean up resources
- `help` - Show usage information

---

## Testing Strategy

### When to Use Each Approach

#### Use Ephemeral Containers When:

✅ Running tests before committing
✅ Running tests in CI/CD pipeline
✅ Need isolated, reproducible results
✅ Testing integration or E2E scenarios
✅ Generating coverage reports

```bash
npm run test:docker
```

#### Use Dev Container Testing When:

✅ Actively developing and need fast feedback
✅ Doing TDD (Test-Driven Development)
✅ Running specific test files repeatedly
✅ Debugging failing tests

```bash
# Start dev containers first
docker-compose up -d

# Run tests in watch mode
npm run test:docker:watch

# Or run tests directly in a service
docker-compose exec admin npm run test:admin:watch
```

---

## Architecture

### Ephemeral Test Containers

The `compose.test.yaml` file defines separate test services that:

1. Start from a clean state
2. Run tests with `CI=true` environment
3. Output results
4. Automatically shut down

```yaml
services:
  admin-test:
    build: ...
    environment:
      - NODE_ENV=test
      - CI=true
    command: ["npx", "nx", "test", "ally-admin-dashboard", "--run"]
```

### File Structure

```
ally-web/
├── compose.yaml           # Development services
├── compose.test.yaml      # Test services (ephemeral)
├── test-docker.sh         # Test runner script
├── TESTING.md            # This file
└── apps/
    ├── ally-admin-dashboard/
    └── ally-helpline-dashboard/
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build deps image
        run: docker build -f Dockerfile.deps -t ally-web/deps:dev .

      - name: Run all tests
        run: docker-compose -f compose.test.yaml run --rm test-all

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./coverage
```

---

## Troubleshooting

### Tests Fail to Start

**Problem:** `ERROR: Service 'admin-test' failed to build`

**Solution:**

1. Build the deps image first:

   ```bash
   docker build -f Dockerfile.deps -t ally-web/deps:dev .
   ```

2. Try running tests again:
   ```bash
   npm run test:docker
   ```

### Port Already in Use

**Problem:** Port conflicts with running dev containers

**Solution:** Test containers don't expose ports, so this shouldn't happen. If it does, make sure you're using `compose.test.yaml`:

```bash
docker-compose -f compose.test.yaml down
```

### Out of Disk Space

**Problem:** Docker runs out of space

**Solution:**

```bash
# Clean up test resources
npm run test:docker:clean

# Clean Docker system
docker system prune -a --volumes

# Or use the Colima cleanup script
# Ensure you have the backend and services running locally.
./colima-cleanup.sh
```

### Slow Test Runs

**Problem:** Tests take too long to start

**Solution:**

1. Use watch mode for development:

   ```bash
   npm run test:docker:watch
   ```

2. Or run tests directly in dev containers:
   ```bash
   docker-compose exec admin npm run test:admin
   ```

---

## Best Practices

1. **Always run `test:docker` before committing**

   ```bash
   npm run test:docker
   ```

2. **Use watch mode during development**

   ```bash
   npm run test:docker:watch
   ```

3. **Generate coverage reports regularly**

   ```bash
   npm run test:docker:coverage
   ```

4. **Clean up resources periodically**

   ```bash
   npm run test:docker:clean
   ```

5. **Keep tests fast and focused**
   - Unit tests should run in milliseconds
   - Integration tests in seconds
   - E2E tests in separate suites

---

## Advanced Usage

### Run Tests with Custom Environment Variables

```bash
docker-compose -f compose.test.yaml run --rm \
  -e API_URL=http://custom-backend:8001 \
  admin-test
```

### Run Specific Test Files

```bash
docker-compose -f compose.test.yaml run --rm \
  admin-test \
  npx nx test ally-admin-dashboard --testFile=src/api/api.test.ts
```

### Debug Tests

```bash
# Run tests with verbose output
docker-compose -f compose.test.yaml run --rm \
  admin-test \
  npx nx test ally-admin-dashboard --verbose

# Or attach to running container
docker-compose exec admin bash
cd apps/ally-admin-dashboard
npm run test -- --verbose
```

---

## Performance Tips

1. **Keep deps image cached**: The `ally-web/deps:dev` image contains all dependencies and is reused across test runs.

2. **Use watch mode for TDD**: Instead of running ephemeral containers repeatedly, use watch mode.

3. **Run tests in parallel**: The `test-all` service runs all tests in parallel for faster results.

4. **Limit test scope**: Run only the tests for the code you're working on:
   ```bash
   npm run test:docker:admin  # Only admin tests
   ```

---

## Questions?

For more information, see:

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/)

Or check the project's main README.md
