# Scripts

This directory contains utility scripts for the Ally Web project.

## docker-switch.sh

A script to easily switch between Docker Desktop and Colima.

### Usage

```bash
# Switch to Docker Desktop (default)
./scripts/docker-switch.sh desktop

# Or simply
./scripts/docker-switch.sh

# Switch to Colima
./scripts/docker-switch.sh colima
```

### What it does

- Switches Docker context
- Updates Docker credential helper configuration
- Links docker-compose plugin correctly
- Verifies the setup

### Requirements

- Docker CLI installed
- For Colima: `brew install colima docker-compose`
- For Docker Desktop: Docker Desktop app installed

### See Also

For detailed Colima setup instructions, see [docs/colima.md](../docs/colima.md)
