# Testing Guide

This document provides comprehensive information about testing setup and practices across all repositories in the Ally UI monorepo.

## Overview

The monorepo includes three main projects with different testing configurations:

- **ally-web** (Next.js): Jest + React Testing Library
- **ally-helpline-dashboard** (React + Vite): Vitest + React Testing Library
- **ui-shared** (Library): Vitest + React Testing Library

## Quick Start

### Run All Tests

```bash
npm run test
```

### Run Tests for Specific Project

```bash
# Next.js app
npm run test:web

# Helpline dashboard
npm run test:helpline

# UI shared library
npm run test:ui-shared
```

### Watch Mode

```bash
# All projects
npm run test:watch

# Specific project
npm run test:web:watch
npm run test:helpline:watch
npm run test:ui-shared:watch
```

### Coverage Reports

```bash
# All projects with coverage
npm run test:coverage

# Specific project with coverage
npm run test:web:coverage
npm run test:helpline:coverage
npm run test:ui-shared:coverage
```

## Project-Specific Testing

### ally-web (Next.js)

**Testing Framework**: Jest + React Testing Library

**Configuration**: `apps/ally-web/jest.config.js`

**Key Features**:

- Next.js integration with `next/jest`
- JSDOM environment for DOM testing
- Path mapping support (`@/` alias)
- Coverage reporting

**Example Test**:

```typescript
import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

describe('HomePage', () => {
  it('renders without crashing', () => {
    render(<HomePage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
```

### ally-helpline-dashboard (React + Vite)

**Testing Framework**: Vitest + React Testing Library

**Configuration**: `apps/ally-helpline-dashboard/vite.config.ts` (test section)

**Key Features**:

- Vitest integration with Vite
- JSDOM environment
- Comprehensive path aliases
- Mock setup for WebSocket, AudioContext, etc.

**Example Test**:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@components/button/Button'

describe('Button', () => {
  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### ui-shared (Library)

**Testing Framework**: Vitest + React Testing Library

**Configuration**: `libs/ui-shared/vitest.config.ts`

**Key Features**:

- Isolated library testing
- JSDOM environment
- Coverage reporting
- Mock setup for browser APIs

**Example Test**:

```typescript
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders with default props', () => {
    render(<Badge>Test Badge</Badge>)
    expect(screen.getByText('Test Badge')).toBeInTheDocument()
  })
})
```

## Testing Best Practices

### File Naming

- Test files should end with `.test.tsx` or `.test.ts`
- Place test files next to the components they test
- Use descriptive test file names

### Test Structure

```typescript
describe('ComponentName', () => {
  it('should do something specific', () => {
    // Arrange
    const props = { ... }

    // Act
    render(<ComponentName {...props} />)

    // Assert
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })
})
```

### Common Testing Patterns

#### Testing User Interactions

```typescript
import { fireEvent, waitFor } from '@testing-library/react'

it('handles user input', async () => {
  const handleSubmit = vi.fn()
  render(<Form onSubmit={handleSubmit} />)

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'test@example.com' }
  })

  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

  await waitFor(() => {
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com'
    })
  })
})
```

#### Testing Async Operations

```typescript
import { waitFor } from '@testing-library/react'

it('loads data asynchronously', async () => {
  render(<DataComponent />)

  expect(screen.getByText('Loading...')).toBeInTheDocument()

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument()
  })
})
```

#### Testing with Context/Providers

```typescript
import { render } from '@testing-library/react'
import { ThemeProvider } from './ThemeProvider'

const renderWithProviders = (ui, options = {}) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider>{children}</ThemeProvider>
    ),
    ...options,
  })
}

it('renders with theme context', () => {
  renderWithProviders(<ThemedComponent />)
  // Test implementation
})
```

## Coverage Requirements

### Global Thresholds

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Project-Specific Thresholds

- **ally-web**: 60% (lower due to Next.js complexity)
- **ally-helpline-dashboard**: 70%
- **ui-shared**: 80% (higher for shared library)

## Mock Setup

### Global Mocks

All projects include mocks for:

- `IntersectionObserver`
- `ResizeObserver`
- `window.matchMedia`
- `WebSocket` (helpline dashboard)
- `AudioContext` (helpline dashboard)
- `MediaDevices` (helpline dashboard)

### Custom Mocks

Create custom mocks in test files when needed:

```typescript
// Mock a module
vi.mock("@/api/client", () => ({
  fetchData: vi.fn().mockResolvedValue({ data: "test" }),
}));

// Mock a hook
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Test User" },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));
```

## Debugging Tests

### Vitest UI

```bash
# Open Vitest UI for interactive testing
npm run test:ui-shared:ui
```

### Debug Mode

```bash
# Run tests in debug mode
npx vitest --inspect-brk
```

### Verbose Output

```bash
# Run with verbose output
npx vitest --reporter=verbose
```

## CI/CD Integration

Tests are automatically run in CI/CD pipelines. Coverage reports are generated and can be viewed in the `coverage/` directory.

### Coverage Reports

- **HTML**: `coverage/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON**: `coverage/coverage-final.json`

## Troubleshooting

### Common Issues

1. **Module not found errors**: Check path aliases in configuration files
2. **Mock not working**: Ensure mocks are defined before imports
3. **Async test failures**: Use `waitFor` or `findBy` queries
4. **Coverage not updating**: Clear coverage directory and re-run tests

### Getting Help

- Check the [Vitest documentation](https://vitest.dev/)
- Check the [Jest documentation](https://jestjs.io/)
- Check the [React Testing Library documentation](https://testing-library.com/docs/react-testing-library/intro/)
