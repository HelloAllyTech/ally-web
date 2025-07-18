# Naming Conventions Guide

## Overview

This document outlines the standardized naming conventions for our React/TypeScript/Next.js monorepo. Following these conventions ensures code consistency, readability, and maintainability across the project.

## File and Folder Naming

### React Components & TypeScript Files

- **Convention**: `PascalCase` for component files, `camelCase` for utility files
- **Examples**:
  - `ResourceCard.tsx`, `SearchHeader.tsx`, `UserProfile.tsx`
  - `logger.ts`, `types.ts`, `utils.ts`, `constants.ts`
- **Why**: PascalCase clearly identifies React components, while camelCase is standard for utilities and follows TypeScript conventions

### Folder Names

- **Convention**: `kebab-case` for feature folders, `camelCase` for utility folders
- **Examples**:
  - `resource-card/`, `search-header/`, `bottom-tab/`, `user-profile/`
  - `ui-shared/`, `ally-web/`, `utils/`, `hooks/`
- **Why**: Kebab-case is more readable in URLs and file paths, especially for feature-based folders

### CSS/SCSS Files

- **Convention**: `kebab-case` for component styles, `camelCase` for global styles
- **Examples**:
  - `page.module.css`, `global.css`, `variables.css`
  - `resource-card.module.css`, `search-header.module.css`
- **Why**: Follows CSS module conventions and maintains consistency with component naming

## Code Naming Conventions

### Variables, Functions, and Properties

- **Convention**: `camelCase`
- **Examples**:
  - `userName`, `handleClick`, `isLoading`, `fetchUserData`
  - `onSubmit`, `setUserProfile`, `validateEmail`
- **Why**: Standard JavaScript/TypeScript convention, widely adopted and readable

### Constants

- **Convention**: `UPPER_SNAKE_CASE` for true constants, `camelCase` for configuration objects
- **Examples**:
  - `API_BASE_URL`, `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`
  - `defaultConfig`, `themeSettings`, `appConstants`
- **Why**: Makes constants immediately identifiable and follows JavaScript conventions

### TypeScript Types and Interfaces

- **Convention**: `PascalCase`
- **Examples**:
  - `UserProfile`, `ApiResponse`, `ButtonProps`, `SearchResult`
  - `ComponentState`, `FormData`, `NavigationItem`
- **Why**: Clearly distinguishes types from variables and follows TypeScript community standards

### CSS Classes and IDs

- **Convention**: `kebab-case`
- **Examples**:
  - `resource-card`, `search-container`, `btn-primary`
  - `user-avatar`, `nav-menu`, `form-input`
- **Why**: Standard CSS convention, more readable than camelCase in stylesheets

## Icon and Asset Naming

### Icon Names

- **Convention**: `kebab-case` with descriptive prefixes
- **Examples**:
  - `icon-search`, `icon-user-profile`, `icon-arrow-right`
  - `icon-home`, `icon-settings`, `icon-notification`
- **Why**: Clear, descriptive, and follows common icon library conventions

### Image and Asset Files

- **Convention**: `kebab-case` with size/type suffixes
- **Examples**:
  - `hero-image-large.jpg`, `logo-dark.svg`, `avatar-placeholder.png`
  - `banner-desktop.jpg`, `icon-menu-mobile.svg`, `background-pattern.png`
- **Why**: Descriptive and includes important metadata like size or variant

## Configuration and Build Files

### Configuration Files

- **Convention**: `camelCase` with descriptive names
- **Examples**:
  - `next.config.js`, `tailwind.config.js`, `eslint.config.mjs`
  - `postcss.config.js`, `tsconfig.json`, `package.json`
- **Why**: Follows tool-specific conventions and is immediately recognizable

### Environment Files

- **Convention**: `dotenv` format with `UPPER_SNAKE_CASE`
- **Examples**:
  - `.env.local`, `.env.production`, `.env.development`
  - Variables: `API_BASE_URL`, `DATABASE_URL`, `JWT_SECRET`
- **Why**: Standard environment variable convention

## Component Structure

### Component File Organization

```
ComponentName/
├── ComponentName.tsx          # Main component
├── ComponentName.module.css   # Component styles
├── ComponentName.test.tsx     # Component tests
├── ComponentName.stories.tsx  # Storybook stories (if applicable)
└── index.ts                   # Export file
```

### Hook Naming

- **Convention**: `use` prefix with `camelCase`
- **Examples**:
  - `useUserData`, `useLocalStorage`, `useApiCall`
  - `useFormValidation`, `useInfiniteScroll`
- **Why**: Clear indication that it's a custom hook

### Context Naming

- **Convention**: `PascalCase` with `Context` suffix
- **Examples**:
  - `UserContext`, `ThemeContext`, `AuthContext`
- **Why**: Clearly identifies React context providers

## API and Data Naming

### API Endpoints

- **Convention**: `kebab-case` for URLs, `camelCase` for function names
- **Examples**:
  - URLs: `/api/user-profile`, `/api/search-results`
  - Functions: `fetchUserProfile`, `getSearchResults`
- **Why**: RESTful API conventions for URLs, JavaScript conventions for functions

### Database Fields

- **Convention**: `snake_case` for database columns, `camelCase` for JavaScript objects
- **Examples**:
  - Database: `user_name`, `created_at`, `is_active`
  - JavaScript: `userName`, `createdAt`, `isActive`
- **Why**: Database conventions vs JavaScript conventions

## Testing Naming

### Test Files

- **Convention**: Same name as source file with `.test` or `.spec` suffix
- **Examples**:
  - `ComponentName.test.tsx`, `utils.test.ts`
  - `ComponentName.spec.tsx`, `utils.spec.ts`
- **Why**: Clear association with source files

### Test Descriptions

- **Convention**: Descriptive sentences in `camelCase`
- **Examples**:
  - `should render user profile correctly`
  - `handles empty search results`
  - `validates email format properly`
- **Why**: Clear, readable test descriptions

## Git and Version Control

### Branch Naming

- **Convention**: `type/description` with `kebab-case`
- **Examples**:
  - `feature/user-profile`, `bugfix/search-results`
  - `hotfix/critical-error`, `refactor/naming-conventions`
- **Why**: Clear indication of branch purpose and type

### Commit Messages

- **Convention**: Conventional Commits format
- **Examples**:
  - `feat: add user profile component`
  - `fix: resolve search results pagination`
  - `refactor: standardize naming conventions`
- **Why**: Clear, structured commit history

## Implementation Guidelines

### When to Apply

1. **New Code**: Always follow conventions for new files and code
2. **Refactoring**: Apply conventions when touching existing files
3. **Gradual Migration**: Update existing code during maintenance

### Tools and Automation

- **ESLint**: Configure rules to enforce naming conventions
- **Prettier**: Maintain consistent formatting
- **Husky**: Pre-commit hooks for validation
- **CI/CD**: Automated checks in build pipeline

### Team Communication

- **Code Reviews**: Enforce conventions during review process
- **Documentation**: Keep this guide updated with team feedback
- **Training**: Share with new team members during onboarding

## Common Anti-Patterns to Avoid

❌ **Avoid**:

- Mixed cases in the same context (`userName` vs `user_name`)
- Abbreviations without clear meaning (`usr`, `btn`)
- Generic names (`data`, `item`, `obj`)
- Numbers at the start of names (`1user`, `2button`)

✅ **Prefer**:

- Consistent casing within each context
- Descriptive, full words
- Specific, meaningful names
- Names that start with letters

## Questions and Updates

For questions about specific naming scenarios or to suggest updates to these conventions, please:

1. Create an issue in the project repository
2. Discuss with the team during code reviews
3. Update this document when consensus is reached

---

_Last updated: [Current Date]_
_Maintained by: Development Team_
