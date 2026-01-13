# Docker with Colima Setup

This guide helps you set up and use Colima as an alternative to Docker Desktop on macOS.

## What is Colima?

Colima is a lightweight, open-source container runtime for macOS that provides an alternative to Docker Desktop. It uses minimal resources and integrates seamlessly with Docker CLI.

## Prerequisites

- Homebrew installed
- Docker CLI installed

## Installation

1. **Install Colima:**

   ```bash
   brew install colima
   ```

2. **Install Docker Compose (if not already installed):**
   ```bash
   brew install docker-compose
   ```

## Initial Setup

1. **Start Colima:**

   ```bash
   colima start
   ```

2. **Fix Docker Configuration:**

   Run the switch script to configure Docker for Colima:

   ```bash
   ./scripts/docker-switch.sh colima
   ```

   This script will:
   - Switch Docker context to Colima
   - Remove Docker Desktop credential helper
   - Link docker-compose plugin correctly

## Manual Setup (Alternative)

If you prefer to configure manually:

1. **Remove Docker Desktop credential helper:**

   ```bash
   # Edit ~/.docker/config.json and remove the "credsStore": "desktop" line
   # Or use sed:
   sed -i '' '/"credsStore": "desktop",/d' ~/.docker/config.json
   ```

2. **Fix docker-compose plugin:**

   ```bash
   rm ~/.docker/cli-plugins/docker-compose
   ln -sfn /opt/homebrew/bin/docker-compose ~/.docker/cli-plugins/docker-compose
   ```

3. **Switch Docker context:**

   ```bash
   docker context use colima
   ```

4. **Verify setup:**
   ```bash
   docker info
   docker compose version
   ```

## Building and Running

Once set up, use Docker commands normally:

```bash
# Build the deps image
docker build -f Dockerfile.deps -t ally-web/deps:dev .

# Start services
docker compose up

# Stop services
docker compose down
```

## Switching Between Colima and Docker Desktop

Use the provided switch script:

```bash
# Switch to Colima
./scripts/docker-switch.sh colima

# Switch to Docker Desktop
./scripts/docker-switch.sh desktop
```

## Troubleshooting

### "docker-credential-desktop: executable file not found"

This means Docker is still configured to use Docker Desktop's credential helper. Run:

```bash
./scripts/docker-switch.sh colima
```

### "docker: unknown command: docker compose"

The docker-compose plugin isn't properly linked. Run:

```bash
rm ~/.docker/cli-plugins/docker-compose
ln -sfn /opt/homebrew/bin/docker-compose ~/.docker/cli-plugins/docker-compose
```

### Colima won't start

Try stopping and restarting:

```bash
colima stop
colima start
```

Or delete and recreate:

```bash
colima delete
colima start
```

## Resource Configuration

Colima allows you to configure CPU, memory, and disk:

```bash
# Start with custom resources
colima start --cpu 4 --memory 8 --disk 60

# Or edit the config
colima start --edit
```

## Stopping Colima

```bash
# Stop Colima (containers will stop)
colima stop

# Delete Colima VM completely
colima delete
```

## Benefits of Colima

- **Free and open-source** - No licensing costs
- **Lightweight** - Uses fewer resources than Docker Desktop
- **Fast** - Quick startup and container operations
- **Compatible** - Works with existing Docker commands and Compose files

## Notes

- Colima uses macOS Virtualization.Framework for better performance
- Your Docker images and containers are stored in the Colima VM
- Switching between Colima and Docker Desktop means separate image caches
