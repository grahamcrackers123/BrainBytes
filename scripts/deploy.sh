#!/bin/bash
# BrainBytes Deployment Script
# Usage: ./deploy.sh [environment]
#   environment: test | staging | production (default: test)

set -e

ENVIRONMENT="${1:-test}"
DEPLOY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEPLOY_SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:7000}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:5000/health}"
ROLLBACK_ENABLED="${ROLLBACK_ENABLED:-true}"

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

# Capture current container state for rollback
ROLLBACK_IMAGES=""
if [ "$ROLLBACK_ENABLED" = "true" ] && docker compose -f "$COMPOSE_FILE" ps -q 2>/dev/null | grep -q .; then
  echo "Capturing current container state for rollback..."
  ROLLBACK_IMAGES=$(docker compose -f "$COMPOSE_FILE" images -q 2>/dev/null || true)
fi

# Pull latest images
echo "Pulling latest images..."
docker compose -f "$COMPOSE_FILE" pull

# Stop existing containers
echo "Stopping existing containers..."
docker compose -f "$COMPOSE_FILE" down || true

# Start new containers
echo "Starting new containers..."
docker compose -f "$COMPOSE_FILE" up -d --build

# Health check against live endpoints
echo "Waiting for services to be ready..."
sleep 10
HEALTHY=false
for i in $(seq 1 30); do
  if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
    echo "Frontend is up!"
    HEALTHY=true
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 2
done

if curl -sf "$BACKEND_HEALTH_URL" > /dev/null 2>&1; then
  echo "Backend API is up!"
else
  echo "Warning: Backend health check failed"
  HEALTHY=false
fi

# Rollback on failure
if [ "$HEALTHY" = "false" ] && [ "$ROLLBACK_ENABLED" = "true" ] && [ -n "$ROLLBACK_IMAGES" ]; then
  echo "=== HEALTH CHECK FAILED: Rolling back to previous deployment ==="
  docker compose -f "$COMPOSE_FILE" down || true
  docker compose -f "$COMPOSE_FILE" up -d
  exit 1
fi

echo ""
echo "=== Deployment to $ENVIRONMENT complete ==="
