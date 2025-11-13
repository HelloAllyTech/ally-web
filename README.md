# Ally UI Monorepo

This monorepo contains multiple applications for the Ally platform:

- Ally Web: A modern landing page for our mental health AI assistance platform
- Ally Helpline Dashboard: Dashboard application for mental health professionals
- Ally Admin Dashboard: Dashboard application for super admin

## Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Git

## Setup Instructions

1. Clone the repository:

```bash
git clone <repository-url>
cd ally-UI-mono
```

2. Install dependencies:

```bash
npm install
```

3. Start the development servers:

For Ally Web:

```bash
npm run start:web
```

For Ally Helpline Dashboard:

```bash
npm run start:helpline
```

For Ally Admin Dashboard:

```bash
npm run start:admin
```

## Project Structure

```
ally-UI-mono/
├── apps/
│   ├── ally-web/                  # Landing page application
│   └── ally-helpline-dashboard/   # Main dashboard application
│   └── ally-admin-dashboard/      # Main dashboard application
├── libs/                          # Shared libraries
├── nx.json                        # NX configuration
├── package.json                   # Root dependencies
└── tsconfig.base.json            # Base TypeScript configuration
```

## Applications

### Ally Web (apps/ally-web)

A Next.js application showcasing our platform's features and mission:

- Modern, responsive design
- Gradient-based UI components
- Interactive elements and smooth animations
- Optimized for performance and accessibility

### Ally Helpline Dashboard (apps/ally-helpline-dashboard)

The main dashboard application for mental health professionals.

### Ally Admin Dashboard (apps/ally-admin-dashboard)

The main dashboard application for super admin for user managament and simulation management.

## Available Commands

```bash
# Ally Web Commands
npm run start:web           # Start development server
npm run build:web        # Build for production
npm run test:web      # running test cases
npx nx lint ally-web     # Lint code

# Ally Helpline Dashboard Commands
npm run start:helpline           # Start development server
npm run build:helpline        # Build for production
npm run test:helpline      # running test cases
npx nx lint ally-helpline-dashboard

# Ally Admin Dashboard Commands
npm run start:admin           # Start development server
npm run build:admin        # Build for production
npm run test:admin      # running test cases
npx nx lint ally-admin-dashboard
```

## Development Guidelines

1. **Code Style**: Follow the project's ESLint and Prettier configurations
2. **Styling**:
   - Ally Web: Uses CSS Modules with custom properties
   - Helpline Dashboard: Uses Tailwind CSS
   - Admin Dashboard: Uses Tailwind CSS
3. **TypeScript**: Maintain strict type checking and follow the base TSConfig
4. **Components**: Create reusable components in the appropriate application's components directory

## Dockerized setup (shared deps image)

Use Docker for a consistent local dev environment leveraging a shared base image for dependencies.

- **Prerequisites**
  - Docker Desktop
  - Docker Compose
- **Build the shared base image (once or when deps change)**

```bash
docker build -f Dockerfile.deps -t ally-web/deps:dev .
```

- **Rebuild app images (now FROM ally-web/deps:dev)**

```bash
docker compose build
```

- **Run specific services**
  Web (Next.js):

```bash
docker compose up web
```

Helpline (Vite):

```bash
docker compose up helpline
```

Admin (Vite):

```bash
docker compose up admin
```

- **Detached mode**

```bash
docker compose up -d web
```

- **Stop everything**

```bash
docker compose down
```

## Contributing

1. Create a new branch for your feature/fix
2. Follow the project's code style and conventions
3. Test your changes thoroughly
4. Submit a pull request with a clear description of changes

## Support

For issues and support:

- Check the project documentation
- Review existing issues
- Contact the development team
