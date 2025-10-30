# Ally Admin Dashboard

A comprehensive admin dashboard for managing simulations, events, and users in the Ally platform. Built with React, Vite, Tailwind CSS, and RTK Query in an Nx monorepo architecture.

## Overview

The Ally Admin Dashboard is a powerful administrative interface that enables administrators to:

- Create and manage voice-based simulation scenarios
- Configure and map session events to simulations
- Manage users, organizations (tenants), and permissions
- Preview and test simulations in real-time with LiveKit integration
- Monitor simulation credits and user activity

## Key Features

- ⚡ **Vite** - Lightning-fast build tool and dev server with HMR
- ⚛️ **React 18** - Modern React with hooks and concurrent features
- 🎨 **Tailwind CSS** - Utility-first CSS framework with custom animations
- 🔄 **RTK Query** - Powerful data fetching, caching, and state management
- 🏗️ **Nx** - Enterprise-grade monorepo tooling and build system
- 🎙️ **LiveKit** - Real-time voice communication for simulation previews
- 🔐 **Permission-based Access Control** - Role-based routing and feature access
- 📊 **Comprehensive Testing** - Vitest + Testing Library for unit and integration tests
- 🎭 **TypeScript** - Full type safety across the application
- 🌐 **Sonner** - Beautiful toast notifications

## Development

### Prerequisites

- Node.js 18+ or later
- npm 8+
- Git

### Local Development

```bash
# Install dependencies (from workspace root)
npm install

# Start the development server
npm run start:admin

# Or using Nx directly
npx nx serve ally-admin-dashboard
```

The app will be available at `http://localhost:8080`

### Available Scripts

```bash
# Development
npm run start:admin                 # Start dev server on port 8080
npx nx serve ally-admin-dashboard   # Alternative dev server command

# Building
npx nx build ally-admin-dashboard   # Build for production
npx nx build ally-admin-dashboard --configuration=production

# Testing
npm run test:admin                  # Run all tests
npx nx test ally-admin-dashboard --watch  # Watch mode
npx nx test ally-admin-dashboard --configuration=coverage  # With coverage

# Linting
npx nx lint ally-admin-dashboard    # Run ESLint
npm run lint:fix                    # Auto-fix linting issues

# Code Formatting
npm run format                      # Format all files with Prettier
npm run format:check                # Check formatting
```

## Project Structure

```
apps/ally-admin-dashboard/
├── src/
│   ├── api/                    # RTK Query API definitions
│   │   ├── auth.ts            # Authentication endpoints
│   │   ├── baseApi.ts         # Base API with auth refresh logic
│   │   ├── simulationStudio.ts # Simulation management endpoints
│   │   └── userManagement.ts  # User and tenant endpoints
│   ├── assets/                 # Static assets (images, SVGs)
│   │   ├── images/            # PNG/JPG images
│   │   └── svg/               # SVG icons
│   ├── components/             # Reusable UI components
│   │   ├── button/            # Custom button component
│   │   ├── custom-dropdown/   # Dropdown component
│   │   ├── emoji-picker/      # Emoji picker for simulations
│   │   ├── event-side-panel/  # Event editing panel
│   │   ├── file-upload/       # File upload with drag & drop
│   │   ├── header/            # App header
│   │   ├── notion-table/      # Editable table component
│   │   ├── sidebar/           # Navigation sidebar
│   │   ├── tabs/              # Tab navigation
│   │   └── [40+ more components]
│   ├── constants/              # App-wide constants
│   │   ├── common.ts          # API endpoints, routes, keys
│   │   ├── demographics.ts    # Demographic options
│   │   ├── en.ts              # English language strings
│   │   ├── permissions.ts     # Permission definitions
│   │   ├── simulation.ts      # Simulation constants
│   │   └── user.ts            # User-related constants
│   ├── hooks/                  # Custom React hooks
│   │   ├── useClickOutside.ts # Click outside detection
│   │   ├── useDebounce.ts     # Debounce hook
│   │   ├── useLiveKitRoom.ts  # LiveKit room management
│   │   └── useUser.ts         # User state management
│   ├── pages/                  # Top-level page components
│   │   ├── CreateSimulation/  # Simulation creator page
│   │   ├── EventManagement/   # Event management page
│   │   ├── LiveSimulationPreview/ # Real-time preview page
│   │   ├── Login/             # Login with OTP
│   │   ├── SimulationStudio/  # Main simulations list
│   │   └── UserManagement/    # User and tenant management
│   ├── reducer/                # Redux reducers
│   │   └── userReducer.ts     # User state reducer
│   ├── routes/                 # Routing configuration
│   │   ├── PrivateLayout.tsx  # Protected route wrapper
│   │   ├── PublicRoute.tsx    # Public route wrapper
│   │   └── RouteLayout.tsx    # Main route definitions
│   ├── store/                  # Redux store configuration
│   │   └── index.ts           # Store setup with RTK Query
│   ├── types/                  # TypeScript type definitions
│   │   ├── auth.ts            # Auth types
│   │   ├── createSimulation.ts # Simulation types
│   │   ├── simulation.ts      # Simulation-related types
│   │   └── user.ts            # User types
│   ├── utils/                  # Utility functions
│   │   ├── common.ts          # Common utilities
│   │   ├── createSimulation.ts # Simulation helpers
│   │   ├── eventMapping.ts    # Event mapping logic
│   │   └── permissions.ts     # Permission utilities
│   ├── App.tsx                 # Root app component
│   ├── main.tsx                # App entry point
│   ├── styles.css              # Global styles with Tailwind
│   └── test-setup.ts           # Test configuration
├── public/
│   └── favicon.ico             # App favicon
├── .dockerignore               # Docker ignore patterns
├── eslint.config.mjs           # ESLint configuration
├── index.html                  # HTML template
├── postcss.config.js           # PostCSS configuration
├── project.json                # Nx project configuration
├── tailwind.config.js          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
├── tsconfig.app.json           # App-specific TS config
├── tsconfig.spec.json          # Test-specific TS config
├── vite.config.ts              # Vite configuration
└── README.md                   # This file
```

## Core Features

### 1. Simulation Studio

- **Simulation Management**: Create, edit, delete, and publish simulation scenarios
- **Cover Image Upload**: Upload and manage simulation cover images with S3 integration
- **Event Mapping**: Map session events to specific simulations
- **Voice Configuration**: Configure AI voice settings for simulations
- **Filtering & Sorting**: Filter simulations by status, search, and sort options
- **Preview Mode**: Test simulations in real-time with LiveKit integration

### 2. Event Management

- **Session Events**: Create and manage reusable session events
- **Event Editor**: Rich editing interface with side panels
- **Bulk Operations**: Create, update, and delete multiple events
- **Event Mapping**: Associate events with simulation scenarios

### 3. User Management

- **User Administration**: Create, edit, and manage users
- **Organization Management**: Manage tenants/organizations
- **Role Management**: Assign roles and permissions to users
- **User Status**: Activate/deactivate user accounts
- **Credit Management**: Allocate and track simulation credits per organization

### 4. Authentication & Authorization

- **OTP-based Login**: Secure login with one-time passwords (phone/email)
- **Token Refresh**: Automatic access token refresh on expiration
- **Permission-based Access**: Route-level and feature-level permission checks
- **Role-based UI**: Dynamic UI based on user permissions

### 5. Real-time Simulation Preview

- **LiveKit Integration**: Real-time voice communication
- **Event Tracking**: Monitor events and scores during preview
- **Session Management**: Start and end preview sessions
- **Connection Handling**: Auto-reconnect and error recovery

## API Integration

The dashboard integrates with the Ally backend API through RTK Query:

### Authentication API

- `POST /v1/auth/login` - User login
- `POST /v2/auth/generate-otp` - Generate OTP for authentication
- `POST /v2/auth/verify-otp` - Verify OTP and get tokens
- `POST /v1/auth/refresh` - Refresh access token
- `GET /v1/users/me` - Get current user profile
- `GET /v1/authorization/permissions` - Get user permissions

### Simulation Studio API

- `GET /v1/learn/admin-scenarios` - Get all simulations
- `GET /v1/learn/admin-scenarios/:id` - Get simulation by ID
- `POST /v1/learn/scenarios` - Create new simulation
- `PUT /v1/learn/scenarios/:id` - Update simulation
- `DELETE /v1/learn/admin-scenarios/:id` - Delete simulation
- `GET /v1/learn/scenario-voices` - Get available voices
- `POST /v1/learn/scenarios/map-events` - Map events to scenario
- `GET /v1/learn/scenarios/:id/events` - Get mapped events
- `POST /v1/learn/scenarios/preview` - Start preview session
- `POST /v1/learn/scenarios/preview/:sessionId/end` - End preview

### Session Events API

- `GET /v1/session-events` - Get all session events
- `POST /v1/session-events` - Create session event(s)
- `PUT /v1/session-events/events/:id` - Update event
- `DELETE /v1/session-events/events` - Delete events

### User Management API

- `GET /v1/users` - Get all users
- `POST /v1/users` - Create new user
- `PATCH /v1/users/:id` - Update user
- `DELETE /v1/users/:id` - Delete user
- `PATCH /v1/users/:id/status` - Update user status
- `GET /v1/tenants` - Get all tenants
- `POST /v1/tenants` - Create tenant
- `PATCH /v1/tenants/:id` - Update tenant
- `GET /v1/authorization/roles` - Get available roles
- `POST /v1/authorization/change-roles` - Change user roles
- `GET /v1/simulation-credits/:id` - Get simulation credits
- `PUT /v1/simulation-credits` - Update credit limit

## Environment Variables

Create a `.env` file in the workspace root:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000

# LiveKit Configuration (for simulation preview)
VITE_LIVEKIT_URL=wss://your-livekit-url.com
```

## Path Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
@src/*           → src/*
@components/*    → src/components/*
@api/*           → src/api/*
@pages/*         → src/pages/*
@utils/*         → src/utils/*
@assets/*        → src/assets/*
@hooks/*         → src/hooks/*
@constants/*     → src/constants/*
@types/*         → src/types/*
@routes/*        → src/routes/*
@store/*         → src/store/*
@reducer/*       → src/reducer/*
@ally-ui-mono/ui-shared → libs/ui-shared/src
```

## Permissions System

The app uses a permission-based access control system:

```typescript
enum Permissions {
  EDIT_SCENARIO = "edit:scenario", // Create/edit simulations
  EDIT_USER = "edit:user", // Manage users
  EDIT_LIVEKIT = "edit:livekit", // LiveKit configuration
  EDIT_EVENT = "edit:session-events", // Manage events
  VIEW_ADMIN_SCENARIO = "view:admin:scenario", // View simulations
}
```

Routes are protected using the `PrivateLayout` component which checks user permissions before rendering.

## Testing

The application uses Vitest for testing:

```bash
# Run all tests
npm run test:admin

# Run tests in watch mode
npx nx test ally-admin-dashboard --watch

# Run tests with coverage
npx nx test ally-admin-dashboard --configuration=coverage

# Update test snapshots
npx nx test ally-admin-dashboard --update
```

### Test Structure

- Unit tests: Component behavior and utility functions
- Integration tests: API interactions and data flow
- Snapshot tests: UI component rendering

Coverage reports are generated in `coverage/apps/ally-admin-dashboard/`

## Technologies & Dependencies

### Core

- **React 18.3.1** - UI library with concurrent features
- **TypeScript 5.7.2** - Type safety and developer experience
- **Vite 6.0.0** - Fast build tool and dev server
- **React Router DOM 6.29.0** - Client-side routing

### State Management

- **@reduxjs/toolkit 2.9.0** - Redux with RTK Query
- **react-redux 9.2.0** - React bindings for Redux

### UI & Styling

- **Tailwind CSS 3.4.3** - Utility-first CSS framework
- **PostCSS 8.4.47** - CSS transformations
- **Framer Motion 12.23.22** - Animations
- **sonner 2.0.7** - Toast notifications
- **emoji-picker-react 4.13.3** - Emoji picker component

### Real-time Communication

- **livekit-client** - LiveKit SDK for real-time voice

### Development Tools

- **Nx 21.1.3** - Monorepo tooling
- **Vitest 3.0.0** - Fast unit testing framework
- **@testing-library/jest-dom 6.9.1** - DOM testing utilities
- **ESLint 9.8.0** - Code linting
- **Prettier 3.6.2** - Code formatting
- **Husky 8.0.0** - Git hooks
- **lint-staged 16.1.2** - Pre-commit linting

### Build Plugins

- **@vitejs/plugin-react** - React support for Vite
- **vite-plugin-svgr** - SVG as React components
- **@nx/vite** - Nx integration for Vite

## Build & Deployment

### Production Build

```bash
# Build the application
npx nx build ally-admin-dashboard --configuration=production

# Output directory
dist/apps/ally-admin-dashboard/
```

### Build Configuration

The production build:

- Minifies JavaScript and CSS
- Optimizes assets and images
- Generates source maps
- Outputs to `dist/apps/ally-admin-dashboard/`
- Enables tree-shaking for smaller bundle size

## Code Quality

### Linting

```bash
# Lint all files
npx nx lint ally-admin-dashboard

# Auto-fix linting issues
npm run lint:fix
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks

The project uses Husky and lint-staged to ensure code quality:

- Auto-formats staged files with Prettier
- Runs ESLint on staged TypeScript/JavaScript files
- Prevents commits with linting errors

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the existing code style
3. Write tests for new features
4. Ensure all tests pass: `npm run test:admin`
5. Ensure linting passes: `npx nx lint ally-admin-dashboard`
6. Submit a pull request

## Troubleshooting

### Common Issues

**Port already in use:**

```bash
# Change port in vite.config.ts or kill the process
lsof -ti:8080 | xargs kill -9
```

**Module not found errors:**

```bash
# Clear Nx cache and reinstall
npx nx reset
rm -rf node_modules
npm install
```

**LiveKit connection issues:**

- Ensure `VITE_LIVEKIT_URL` is set correctly
- Check that the backend is providing valid LiveKit tokens
- Verify network connectivity to LiveKit servers

**API authentication errors:**

- Clear localStorage tokens
- Verify `VITE_API_BASE_URL` points to the correct backend
- Check that backend services are running

## License

MIT

## Links

- [Ally Website](https://www.helloally.ai)
- [Terms of Service](https://www.helloally.ai/terms)
- [Privacy Policy](https://www.helloally.ai/policy)
