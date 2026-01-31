#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME="fnd-quicklaunch-server"
IMAGE_TAG="latest"
DOCKERFILE_PATH="apps/server/Dockerfile"
BUILD_CONTEXT="."

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  FND QuickLaunch - Docker Build${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --tag|-t)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --name|-n)
            IMAGE_NAME="$2"
            shift 2
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -t, --tag TAG       Image tag (default: latest)"
            echo "  -n, --name NAME     Image name (default: fnd-quicklaunch-server)"
            echo "  --no-cache          Build without cache"
            echo "  -h, --help          Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if Dockerfile exists
if [ ! -f "$DOCKERFILE_PATH" ]; then
    echo -e "${RED}Error: Dockerfile not found at ${DOCKERFILE_PATH}${NC}"
    exit 1
fi

echo -e "${BLUE}Configuration:${NC}"
echo -e "  Image name: ${YELLOW}${IMAGE_NAME}${NC}"
echo -e "  Image tag:  ${YELLOW}${IMAGE_TAG}${NC}"
echo -e "  Dockerfile: ${YELLOW}${DOCKERFILE_PATH}${NC}"
echo -e "  Context:    ${YELLOW}${BUILD_CONTEXT}${NC}"
echo ""

# Build the Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
echo ""

docker build \
    ${NO_CACHE} \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    -f "${DOCKERFILE_PATH}" \
    "${BUILD_CONTEXT}"

BUILD_STATUS=$?

echo ""
if [ $BUILD_STATUS -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Build completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Image details:${NC}"
    docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
    echo -e "${YELLOW}To run the image:${NC}"
    echo -e "  docker run -p 3001:3001 ${IMAGE_NAME}:${IMAGE_TAG}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Build failed!${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
