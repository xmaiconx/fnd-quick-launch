#!/bin/sh
set -e

echo "======================================"
echo "FND SaaS QuickLaunch - Docker Entrypoint"
echo "======================================"

# ========================================
# Environment Validation
# ========================================
echo "Validating required environment variables..."

# Database
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is required"
  exit 1
fi
echo "✓ DATABASE_URL configured"

# Redis
if [ -z "$REDIS_URL" ]; then
  echo "ERROR: REDIS_URL is required"
  exit 1
fi
echo "✓ REDIS_URL configured"

# Encryption
if [ -z "$ENCRYPTION_KEY" ]; then
  echo "ERROR: ENCRYPTION_KEY is required"
  exit 1
fi
echo "✓ ENCRYPTION_KEY configured"

echo ""
echo "======================================"
echo "Mode: ${NODE_MODE:-hybrid}"
echo "======================================"

# ========================================
# Database Migrations
# ========================================
echo ""
echo "Checking database migrations..."

# Wait for database to be ready (with timeout)
echo "Checking database connection..."
TIMEOUT=30
ELAPSED=0
until pg_isready -h $(echo $DATABASE_URL | sed -e 's/.*@\(.*\):.*/\1/') -U $(echo $DATABASE_URL | sed -e 's/.*:\/\/\(.*\):.*/\1/') > /dev/null 2>&1; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "⚠ Database connection timeout after ${TIMEOUT}s - starting anyway"
    break
  fi
  echo "Waiting for database to be ready... (${ELAPSED}s/${TIMEOUT}s)"
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -lt $TIMEOUT ]; then
  echo "✓ Database is ready"
fi

# Run migrations
echo "Running database migrations..."
cd libs/database && npm run migrate
cd /app
echo "✓ Migrations completed"

# ========================================
# Start Application
# ========================================
echo ""
echo "======================================"
echo "Starting application..."
echo "======================================"

# Execute the command passed to the container
exec "$@"
