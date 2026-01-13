# Ally UI Monorepo

Welcome to the Ally platform monorepo! This repository contains all frontend applications for our mental health AI assistance platform.

## What's Inside

- **Ally Web** - Next.js landing page showcasing our platform
- **Ally Helpline Dashboard** - Vite app for mental health professionals
- **Ally Admin Dashboard** - Vite app for super admin and user management

## Quick Start

### Step 1: Choose Your Development Environment

We support two Docker environments. Choose the one that works for you:

#### Option A: Docker Desktop (Recommended for most users)

- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- No additional setup needed!

#### Option B: Colima (Lightweight alternative)

- Free and open-source alternative to Docker Desktop
- See [docs/colima.md](docs/colima.md) for setup instructions
- Use `./scripts/docker-switch.sh colima` to configure

**Switching between environments:**

```bash
# Switch to Docker Desktop
./scripts/docker-switch.sh desktop

# Switch to Colima
./scripts/docker-switch.sh colima
```

### Step 2: Get Started

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd ally-web
   ```

2. **Build the base dependencies image:**

   ```bash
   docker build -f Dockerfile.deps -t ally-web/deps:dev .
   ```

3. **Start all services:**

   ```bash
   docker compose up
   ```

   Or start individual services:

   ```bash
   docker compose up web        # Ally Web (port 3000)
   docker compose up helpline   # Helpline Dashboard (port 8080)
   docker compose up admin      # Admin Dashboard (port 8081)
   ```

4. **Access the applications:**
   - Ally Web: http://localhost:3000
   - Helpline Dashboard: http://localhost:8080
   - Admin Dashboard: http://localhost:8081

That's it! You're ready to develop.

## Running Locally (Without Docker)

If you prefer to run without Docker:

1. **Prerequisites:**
   - Node.js 20 (LTS recommended)
   - npm

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run start:web        # Ally Web
   npm run start:helpline   # Helpline Dashboard
   npm run start:admin      # Admin Dashboard
   ```

## Testing

Run tests for all applications:

```bash
npm test                           # Run all tests
npm run test:watch                 # Watch mode for all tests
npm run test:coverage              # Generate coverage report
```

Run tests for specific applications:

```bash
npm run test:web                   # Ally Web tests
npm run test:helpline              # Helpline Dashboard tests
npm run test:admin                 # Admin Dashboard tests
```

Update snapshots:

```bash
npm run test:update-snapshots      # Update all snapshots
npm run test:web:update-snapshots  # Update web snapshots only
```

## Building for Production

```bash
npm run build:web        # Build Ally Web
npm run build:helpline   # Build Helpline Dashboard
npm run build:admin      # Build Admin Dashboard
```

## Code Quality

```bash
npm run lint             # Lint all code
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier
npm run format:check     # Check formatting
```

## Project Structure

```
ally-web/
├── apps/
│   ├── ally-web/                   # Landing page (Next.js)
│   ├── ally-helpline-dashboard/    # Helpline app (Vite)
│   └── ally-admin-dashboard/       # Admin app (Vite)
├── libs/
│   └── ui-shared/                  # Shared UI components
├── docs/
│   └── colima.md                   # Colima setup guide
├── scripts/
│   └── docker-switch.sh            # Switch Docker environments
├── compose.yaml                    # Docker Compose configuration
├── Dockerfile.deps                 # Shared dependencies image
└── nx.json                         # NX workspace configuration
```

## Tech Stack

| Application        | Framework    | Styling      | Port |
| ------------------ | ------------ | ------------ | ---- |
| Ally Web           | Next.js 15   | CSS Modules  | 3000 |
| Helpline Dashboard | Vite + React | Tailwind CSS | 8080 |
| Admin Dashboard    | Vite + React | Tailwind CSS | 8081 |

## Docker Commands Reference

```bash
# Build base dependencies image (run once or when package.json changes)
docker build -f Dockerfile.deps -t ally-web/deps:dev .

# Start all services
docker compose up

# Start specific service
docker compose up web

# Start in detached mode (background)
docker compose up -d

# Rebuild services after code changes
docker compose build

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Clean up everything (including volumes)
docker compose down -v
```

## Development Guidelines

### Code Style

- Follow ESLint and Prettier configurations
- Run `npm run lint:fix` before committing
- Use `npm run format` to format code

### Styling

- **Ally Web**: CSS Modules with custom properties
- **Dashboards**: Tailwind CSS utility classes

### TypeScript

- Maintain strict type checking
- Avoid `any` types
- Create interfaces for component props

### Components

- Create reusable components in `libs/ui-shared/` for shared code
- Keep app-specific components in their respective `apps/` directory
- Use meaningful component and variable names

## Troubleshooting

### Docker Issues

**"docker-credential-desktop: executable file not found"**

```bash
./scripts/docker-switch.sh colima
```

**"the attribute `version` is obsolete"**

- Already fixed in `compose.yaml`

**Husky git warnings in Docker**

- Already handled with `--ignore-scripts` flag

**Port already in use**

```bash
# Find and kill the process using the port
lsof -ti:3000 | xargs kill -9
```

### Build Issues

**Dependencies out of sync**

```bash
# Local development
npm install

# Docker
docker build -f Dockerfile.deps -t ally-web/deps:dev . --no-cache
```

**Stale node_modules**

```bash
# Remove and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. **Create a branch** for your feature/fix

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our guidelines

3. **Test your changes**

   ```bash
   npm run lint
   npm test
   npm run format:check
   ```

4. **Commit with a descriptive message**

   ```bash
   git commit -m "feat: add user profile component"
   ```

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Need Help?

- **Documentation**: Check the `docs/` folder
- **Colima Setup**: See [docs/colima.md](docs/colima.md)
- **Scripts**: See [scripts/README.md](scripts/README.md)
- **Issues**: Open an issue on GitHub
- **Team**: Contact the development team

---

Happy coding! 🚀
