# Ally Admin Dashboard

A modern admin dashboard built with React, Vite, Tailwind CSS, and RTK Query in an Nx monorepo.

## Features

- ⚡ **Vite** - Fast build tool and dev server
- ⚛️ **React 18** - Modern React with hooks
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🔄 **RTK Query** - Powerful data fetching and caching
- 🏗️ **Nx** - Monorepo tooling and build system
- 📦 **Docker** - Containerized deployment

## Development

### Prerequisites

- Node.js 18+
- npm
- Docker (optional)

### Local Development

```bash
# Install dependencies (from workspace root)
npm install

# Start the development server
npm run start:admin

# Or using Nx directly
npx nx serve ally-admin-dashboard
```

The app will be available at `http://localhost:4200`

## Docker Deployment

### Build and Run with Docker

```bash
# Build the Docker image
docker build -f apps/ally-admin-dashboard/Dockerfile -t ally-admin-dashboard .

# Run the container
docker run -p 3000:80 ally-admin-dashboard
```

### Using Docker Compose

```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

The app will be available at `http://localhost:3000`

## Project Structure

```
apps/ally-admin-dashboard/
├── src/
│   ├── app/           # Main app components
│   ├── store/         # Redux store and RTK Query
│   └── styles.css     # Tailwind CSS imports
├── Dockerfile         # Multi-stage Docker build
├── docker-compose.yml # Docker Compose configuration
├── nginx.conf         # Nginx configuration
└── .dockerignore      # Docker ignore patterns
```

## Available Scripts

- `npm run start:admin` - Start development server
- `npx nx build ally-admin-dashboard` - Build for production
- `npx nx test ally-admin-dashboard` - Run tests
- `npx nx lint ally-admin-dashboard` - Run linting

## Environment Variables

The app uses environment variables for configuration. Create a `.env` file in the workspace root:

```env
VITE_API_BASE_URL=https://api.example.com
VITE_APP_TITLE=Ally Admin Dashboard
```

## Technologies Used

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **RTK Query** - Data fetching
- **React Router** - Client-side routing
- **Nx** - Monorepo management
- **Docker** - Containerization
- **Nginx** - Web server
