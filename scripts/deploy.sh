#!/bin/bash
# BrainBytes Deployment Script
# Usage: ./deploy.sh [environment]
#   environment: test | staging | production (default: test)

set -e

ENVIRONMENT="${1:-test}"
DEPLOY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEPLOY_SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"

echo "========================================"
echo " BrainBytes Deployment"
echo " Environment: $ENVIRONMENT"
echo " Timestamp:   $DEPLOY_TIME"
echo " Commit:      $DEPLOY_SHA"
echo "========================================"

# Load environment-specific variables
COMPOSE_DIR="brainbytes-multi-container"
case "$ENVIRONMENT" in
  test)
    COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"
    ;;
  staging)
    COMPOSE_FILE="$COMPOSE_DIR/docker-compose.staging.yml"
    ;;
  production)
    COMPOSE_FILE="$COMPOSE_DIR/docker-compose.prod.yml"
    ;;
  *)
    echo "Unknown environment: $ENVIRONMENT"
    exit 1
    ;;
esac

echo ""
echo "--- Deploying to $ENVIRONMENT ---"

# Pull latest images
echo "Pulling latest images..."
docker compose -f "$COMPOSE_FILE" pull

# Stop existing containers
echo "Stopping existing containers..."
docker compose -f "$COMPOSE_FILE" down || true

# Start new containers
echo "Starting new containers..."
docker compose -f "$COMPOSE_FILE" up -d --build

# Health check
echo "Waiting for services to be ready..."
sleep 10
for i in $(seq 1 30); do
  if curl -sf http://localhost:7000/ > /dev/null 2>&1; then
    echo "Frontend is up!"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 2
done

if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
  echo "Backend API is up!"
else
  echo "Warning: Backend health check failed"
fi

echo ""
echo "=== Deployment to $ENVIRONMENT complete ==="
