#!/bin/bash

# Docker Context Switcher
# Switches between Docker Desktop and Colima
# Usage: ./docker-switch.sh [colima|desktop]
# Default: desktop

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default to desktop if no argument provided
TARGET="${1:-desktop}"

echo -e "${BLUE}Docker Context Switcher${NC}"
echo "========================"
echo ""

# Validate input
if [[ "$TARGET" != "colima" && "$TARGET" != "desktop" ]]; then
    echo -e "${RED}Error: Invalid argument. Use 'colima' or 'desktop'${NC}"
    echo "Usage: $0 [colima|desktop]"
    exit 1
fi

DOCKER_CONFIG="$HOME/.docker/config.json"
COMPOSE_PLUGIN="$HOME/.docker/cli-plugins/docker-compose"

# Function to update Docker config.json
update_docker_config() {
    local mode=$1

    if [[ ! -f "$DOCKER_CONFIG" ]]; then
        echo -e "${YELLOW}Warning: Docker config not found at $DOCKER_CONFIG${NC}"
        return
    fi

    if [[ "$mode" == "colima" ]]; then
        # Remove credsStore for Colima
        if grep -q '"credsStore"' "$DOCKER_CONFIG"; then
            echo -e "${BLUE}Removing Docker Desktop credential helper...${NC}"
            sed -i '' '/"credsStore": "desktop",/d' "$DOCKER_CONFIG"
            sed -i '' '/"credsStore": "desktop"/d' "$DOCKER_CONFIG"
        fi
    else
        # Add credsStore for Docker Desktop
        if ! grep -q '"credsStore"' "$DOCKER_CONFIG"; then
            echo -e "${BLUE}Adding Docker Desktop credential helper...${NC}"
            # Insert credsStore after auths
            sed -i '' 's/"auths": {},/"auths": {},\n\t"credsStore": "desktop",/' "$DOCKER_CONFIG"
        fi
    fi
}

# Function to update docker-compose plugin
update_compose_plugin() {
    local mode=$1

    if [[ "$mode" == "colima" ]]; then
        # Link to Homebrew docker-compose for Colima
        if [[ -f "/opt/homebrew/bin/docker-compose" ]]; then
            echo -e "${BLUE}Linking docker-compose plugin to Homebrew version...${NC}"
            rm -f "$COMPOSE_PLUGIN"
            mkdir -p "$HOME/.docker/cli-plugins"
            ln -sfn /opt/homebrew/bin/docker-compose "$COMPOSE_PLUGIN"
        else
            echo -e "${YELLOW}Warning: Homebrew docker-compose not found. Install with: brew install docker-compose${NC}"
        fi
    else
        # Link to Docker Desktop docker-compose
        if [[ -f "$HOME/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose" ]]; then
            echo -e "${BLUE}Linking docker-compose plugin to Docker Desktop...${NC}"
            rm -f "$COMPOSE_PLUGIN"
            mkdir -p "$HOME/.docker/cli-plugins"
            ln -sfn "$HOME/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose" "$COMPOSE_PLUGIN"
        elif [[ -f "/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose" ]]; then
            echo -e "${BLUE}Linking docker-compose plugin to Docker Desktop...${NC}"
            rm -f "$COMPOSE_PLUGIN"
            mkdir -p "$HOME/.docker/cli-plugins"
            ln -sfn "/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose" "$COMPOSE_PLUGIN"
        else
            echo -e "${YELLOW}Warning: Docker Desktop docker-compose not found${NC}"
        fi
    fi
}

# Function to switch Docker context
switch_context() {
    local mode=$1

    if [[ "$mode" == "colima" ]]; then
        echo -e "${BLUE}Switching Docker context to Colima...${NC}"

        # Check if Colima is running
        if ! colima status &> /dev/null; then
            echo -e "${YELLOW}Colima is not running. Starting Colima...${NC}"
            colima start
        fi

        docker context use colima
    else
        echo -e "${BLUE}Switching Docker context to Docker Desktop...${NC}"

        # Check if Docker Desktop is available
        if docker context ls | grep -q "desktop-linux"; then
            docker context use desktop-linux
        elif docker context ls | grep -q "default"; then
            docker context use default
        else
            echo -e "${RED}Error: Docker Desktop context not found${NC}"
            echo "Please ensure Docker Desktop is installed and running"
            exit 1
        fi
    fi
}

# Main execution
echo -e "${BLUE}Switching to: ${GREEN}${TARGET}${NC}"
echo ""

# Update configurations
update_docker_config "$TARGET"
update_compose_plugin "$TARGET"
switch_context "$TARGET"

echo ""
echo -e "${GREEN}✓ Successfully switched to $TARGET${NC}"
echo ""

# Verify the setup
echo -e "${BLUE}Verifying setup...${NC}"
echo ""

echo "Docker context:"
docker context show

echo ""
echo "Docker info:"
docker info | grep -E "Context|Server Version|Operating System" || true

echo ""
echo "Docker Compose version:"
docker compose version || echo -e "${YELLOW}docker compose not available${NC}"

echo ""
echo -e "${GREEN}Setup complete!${NC}"

if [[ "$TARGET" == "colima" ]]; then
    echo ""
    echo "To stop Colima when done:"
    echo "  colima stop"
    echo ""
    echo "To switch back to Docker Desktop:"
    echo "  $0 desktop"
else
    echo ""
    echo "To switch to Colima:"
    echo "  $0 colima"
fi
