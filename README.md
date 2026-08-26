# Ally Web

A multi-application frontend monorepo for the Ally mental health platform, built with React and Vite. It provides a helpline dashboard for mental health professionals and an admin dashboard for platform management.

## Overview

Ally Web is the frontend layer of the Ally platform that:

- **Provides the Helpline Dashboard** (`ally-helpline-dashboard`) for mental health counselors — real-time chat, appointment scheduling, case management, analytics, and LiveKit voice integration
- **Provides the Admin Dashboard** (`ally-admin-dashboard`) for super admins — simulation management, session event configuration, user and tenant management, permission-based access control, and simulation credit monitoring
- **Shares UI components** across applications via the `libs/ui-shared` library
- **Supports internationalisation** with i18next and multi-language configuration
- **Integrates with the Ally Backend** (`ally-be`) REST API and LiveKit for real-time communication

## Architecture

The system is organised as an Nx monorepo with two applications and one shared library:

### Key Components

- **Helpline Dashboard** (`apps/ally-helpline-dashboard/`) - Vite + React application for counselors; real-time chat, LiveKit voice sessions, calendar, case management, analytics reports, and PDF export
- **Admin Dashboard** (`apps/ally-admin-dashboard/`) - Vite + React application for administrators; scenario and session-event management, user/tenant/permission management, LiveKit simulation preview, and credit monitoring
- **Shared UI Library** (`libs/ui-shared/`) - Reusable React components, utilities, feature flags, and logger shared across all applications

### Technology Stack

| Component            | Tech Used                                         |
| -------------------- | ------------------------------------------------- |
| Helpline Dashboard   | Vite + React 18, Tailwind CSS, MUI, Redux Toolkit |
| Admin Dashboard      | Vite + React 18, Tailwind CSS, RTK Query          |
| State Management     | Redux Toolkit / RTK Query                         |
| Real-time Comm       | LiveKit (voice/video)                             |
| Authentication       | JWT via Ally Backend API                          |
| Internationalisation | i18next, react-i18next                            |
| Forms                | React Hook Form                                   |
| Animations           | Framer Motion                                     |
| Testing              | Vitest + Testing Library                          |
| Monorepo Tooling     | Nx                                                |
| Code Quality         | ESLint + Prettier                                 |

## Codebase Directory Structure

```
ally-web/
├── apps/
│   ├── ally-helpline-dashboard/         # Helpline app for counselors (Vite + React, port 8080)
│   │   ├── src/
│   │   │   ├── api/                     # API client and RTK Query endpoints
│   │   │   ├── components/              # Reusable UI components
│   │   │   ├── containers/              # Page-level container components
│   │   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── i18n/                    # Internationalisation configuration
│   │   │   ├── pages/                   # Route-level page components
│   │   │   ├── reducer/                 # Redux slices
│   │   │   ├── routes/                  # React Router route definitions
│   │   │   ├── store/                   # Redux store configuration
│   │   │   └── types/                   # TypeScript type definitions
│   │   └── Dockerfile.dev               # Development Docker image
│   └── ally-admin-dashboard/            # Admin app for super admins (Vite + React, port 8081)
│       ├── src/
│       │   ├── api/                     # API client and RTK Query endpoints
│       │   ├── components/              # Reusable UI components
│       │   ├── hooks/                   # Custom React hooks
│       │   ├── pages/                   # Route-level page components
│       │   ├── reducer/                 # Redux slices
│       │   ├── routes/                  # React Router route definitions
│       │   ├── store/                   # Redux store configuration
│       │   └── types/                   # TypeScript type definitions
│       └── Dockerfile.dev               # Development Docker image
├── libs/
│   └── ui-shared/                       # Shared components, utilities, feature flags, logger
├── docs/
│   ├── colima.md                        # Colima Docker alternative setup guide
│   └── prompts-meta.md                  # Prompt display names via .meta.json
├── scripts/
│   ├── docker-switch.sh                 # Switch between Docker Desktop and Colima
│   └── i18n-sync.mjs                    # Internationalisation sync script
├── compose.yaml                         # Docker Compose configuration
├── Dockerfile.deps                      # Shared base dependencies image
├── nx.json                              # Nx workspace configuration
├── tsconfig.base.json                   # Base TypeScript configuration
└── package.json                         # Workspace dependencies and npm scripts
```

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js** (v22) - <a href="https://nodejs.org/">Download</a>
- **npm** - Comes with Node.js
- **Docker** (v20.10 or higher) - <a href="https://www.docker.com/get-started">Download</a>
- **Docker Compose** (v2.0 or higher) - Usually included with Docker Desktop

### Docker Environment

We support two Docker environments:

#### Option A: Docker Desktop (Recommended)

- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- No additional setup needed

#### Option B: Colima (Lightweight alternative)

- Free and open-source alternative to Docker Desktop
- See [docs/colima.md](docs/colima.md) for setup instructions

**Switching between environments:**

```bash
# Switch to Docker Desktop
./scripts/docker-switch.sh desktop

# Switch to Colima
./scripts/docker-switch.sh colima
```

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ally-web
```

### 2. Build the Base Dependencies Image

```bash
docker build -f Dockerfile.deps -t ally-web/deps:dev .
```

### 3. Start All Services

```bash
docker compose up
```

Or start individual services:

```bash
docker compose up helpline   # Helpline Dashboard (port 8080)
docker compose up admin      # Admin Dashboard (port 8081)
```

### 4. Access the Applications

- **Helpline Dashboard**: http://localhost:8080
- **Admin Dashboard**: http://localhost:8081

## Running Locally (Without Docker)

If you prefer to run without Docker:

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start development servers:**

   ```bash
   npm run start:helpline   # Helpline Dashboard (port 8080)
   npm run start:admin      # Admin Dashboard (port 8081)
   ```

## 📦 Environment Configuration

Each application reads environment variables from its own `.env` file. Refer to the `compose.yaml` for the variables required by each service:

| Variable                   | Service  | Description                     |
| -------------------------- | -------- | ------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | web      | Backend API base URL            |
| `NEXT_PUBLIC_API_VERSION`  | web      | Backend API version (e.g. `v1`) |
| `VITE_API_BASE_URL`        | helpline | Backend API base URL            |
| `VITE_API_BASE_URL`        | admin    | Backend API base URL            |

## 🏗️ Building for Production

```bash
npm run build:web        # Build Ally Web
npm run build:helpline   # Build Helpline Dashboard
npm run build:admin      # Build Admin Dashboard

# Or build everything at once
npm run build:prod
```

## 🧪 Testing & Code Quality

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for specific applications
npm run test:helpline     # Helpline Dashboard tests
npm run test:admin        # Admin Dashboard tests
npm run test:ui-shared    # Shared UI library tests
```

### Linting & Formatting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without making changes
npm run format:check
```

## ✨ Key Features

### Helpline Dashboard

- **Real-time Chat** - Live messaging with clients via WebSocket
- **LiveKit Voice Sessions** - Integrated voice/video communication
- **Appointment & Calendar Management** - Scheduling and calendar views
- **Case Management** - Create, track, and document client cases
- **Analytics & Reporting** - Session analytics with PDF export
- **Dark/Light Theme** - Configurable UI theme
- **Internationalisation** - Multi-language support via i18next

### Admin Dashboard

- **Simulation Management** - Create and configure voice-based simulation scenarios
- **Session Event Configuration** - Map and manage session events
- **User & Tenant Management** - Manage users, organisations, and permissions
- **Permission-Based Access Control** - Role-based routing and feature access
- **LiveKit Simulation Preview** - Test simulations in real time
- **Credit Monitoring** - Track simulation credits and usage

### Shared Infrastructure

- **Shared UI Library** (`libs/ui-shared`) - Common components, feature flags, and logger
- **Nx Monorepo** - Unified build, test, and lint tooling across both applications
- **Docker Compose** - Single command to start both services

## 🐛 Troubleshooting

### Docker Issues

**"docker-credential-desktop: executable file not found"**

```bash
./scripts/docker-switch.sh colima
```

**Port already in use**

```bash
# Find and kill the process using the port
lsof -ti:8080 | xargs kill -9
lsof -ti:8081 | xargs kill -9
```

### Build Issues

**Dependencies out of sync**

```bash
# Local development
npm install

# Docker (rebuild base image)
docker build -f Dockerfile.deps -t ally-web/deps:dev . --no-cache
```

**Stale node_modules**

```bash
rm -rf node_modules package-lock.json
npm install
```

## Docker Commands Reference

```bash
# Build base dependencies image (run once or when package.json changes)
docker build -f Dockerfile.deps -t ally-web/deps:dev .

# Start all services
docker compose up

# Start in detached mode (background)
docker compose up -d

# Start specific service
docker compose up helpline

# Rebuild services after code changes
docker compose build

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Clean up everything (including volumes)
docker compose down -v
```

## 👥 Contributing

For contributing guidelines, refer to `CONTRIBUTING.md`.

## 📞 Support

For issues, questions, or contributions:

- Open an issue on GitHub
- Contact the development team
- **Colima Setup**: See [docs/colima.md](docs/colima.md)
- **Prompt display names (meta JSON)**: See [docs/prompts-meta.md](docs/prompts-meta.md)
- **Scripts**: See [scripts/README.md](scripts/README.md)

---
