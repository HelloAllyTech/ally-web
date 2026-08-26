#!/bin/bash
# Docker Test Runner Script
# This script provides convenient commands to run tests in Docker containers

set -e

# Detect if colors are supported
if [ -t 1 ]; then
    # Colors for output (only if stdout is a terminal)
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    RED='\033[0;31m'
    NC='\033[0m' # No Color
else
    # No colors if output is not a terminal
    GREEN=''
    YELLOW=''
    BLUE=''
    RED=''
    NC=''
fi

# Show usage
show_usage() {
    echo -e "${BLUE}Docker Test Runner${NC}"
    echo ""
    echo "Usage: ./test-docker.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo -e "  ${GREEN}all${NC}           Run all tests in parallel"
    echo -e "  ${GREEN}helpline${NC}      Run ally-helpline-dashboard tests"
    echo -e "  ${GREEN}admin${NC}         Run ally-admin-dashboard tests"
    echo -e "  ${GREEN}ui-shared${NC}     Run ui-shared library tests"
    echo -e "  ${GREEN}watch${NC}         Run tests in watch mode (in running dev containers)"
    echo -e "  ${GREEN}coverage${NC}      Run all tests with coverage report"
    echo -e "  ${GREEN}clean${NC}         Clean up test containers and volumes"
    echo ""
    echo "Examples:"
    echo "  ./test-docker.sh all         # Run all tests"
    echo "  ./test-docker.sh coverage    # Generate coverage report"
    echo ""
}

# Clean up test containers and volumes
cleanup() {
    echo -e "${YELLOW}Cleaning up test containers and volumes...${NC}"
    docker-compose -f compose.test.yaml down -v
    echo -e "${GREEN}Cleanup complete!${NC}"
}

# Run all tests
run_all_tests() {
    echo -e "${BLUE}Running all tests in Docker...${NC}"
    docker-compose -f compose.test.yaml run --rm test-all
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
    else
        echo -e "${RED}✗ Tests failed with exit code $exit_code${NC}"
        exit $exit_code
    fi
}

# Run specific service tests
run_service_test() {
    local service=$1
    echo -e "${BLUE}Running $service tests in Docker...${NC}"
    docker-compose -f compose.test.yaml run --rm ${service}-test
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ $service tests passed!${NC}"
    else
        echo -e "${RED}✗ $service tests failed with exit code $exit_code${NC}"
        exit $exit_code
    fi
}

# Run tests with coverage
run_coverage() {
    echo -e "${BLUE}Running tests with coverage...${NC}"
    docker-compose -f compose.test.yaml run --rm test-all npm run test:coverage
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Coverage report generated!${NC}"
        echo -e "${YELLOW}Coverage reports saved in ./coverage directory${NC}"
    else
        echo -e "${RED}✗ Coverage generation failed${NC}"
        exit $exit_code
    fi
}

# Run tests in watch mode (uses running dev containers)
run_watch_mode() {
    echo -e "${YELLOW}Starting tests in watch mode...${NC}"
    echo -e "${YELLOW}Note: This uses the running dev containers for fast iteration${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
    echo ""

    # Check if containers are running
    if ! docker-compose ps | grep -q "Up"; then
        echo -e "${RED}Dev containers are not running. Starting them...${NC}"
        docker-compose up -d
        sleep 5
    fi

    # Run tests in watch mode
    docker-compose exec admin npx nx run-many --target=test --all --watch
}

# Main script logic
case "${1:-help}" in
    all)
        run_all_tests
        ;;
    helpline)
        run_service_test "helpline"
        ;;
    admin)
        run_service_test "admin"
        ;;
    ui-shared)
        run_service_test "ui-shared"
        ;;
    watch)
        run_watch_mode
        ;;
    coverage)
        run_coverage
        ;;
    clean)
        cleanup
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac
