# ========================================
# Stage 1: Base - Dependencies Installation
# ========================================
FROM node:20-alpine AS base

# Install production dependencies needed for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files for dependency resolution
COPY package*.json ./
COPY turbo.json ./
COPY apps/server/package*.json ./apps/server/
COPY libs/domain/package*.json ./libs/domain/
COPY libs/contracts/package*.json ./libs/contracts/
COPY libs/database/package*.json ./libs/database/
COPY libs/shared/package*.json ./libs/shared/

# Install all dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# ========================================
# Stage 2: Builder - Compile TypeScript
# ========================================
FROM base AS builder

WORKDIR /app

# Copy TypeScript configs
COPY tsconfig.base.json ./
COPY libs/domain/tsconfig.json ./libs/domain/
COPY libs/contracts/tsconfig.json ./libs/contracts/
COPY libs/database/tsconfig.json ./libs/database/
COPY libs/shared/tsconfig.json ./libs/shared/
COPY apps/server/tsconfig.json ./apps/server/

# Copy source code
COPY libs/domain/src ./libs/domain/src
COPY libs/contracts/src ./libs/contracts/src
COPY libs/database/src ./libs/database/src
COPY libs/database/migrations ./libs/database/migrations
COPY libs/database/scripts ./libs/database/scripts
COPY libs/database/knexfile.js ./libs/database/knexfile.js
COPY libs/shared/src ./libs/shared/src
COPY apps/server/src ./apps/server/src

# Build packages in dependency order
# 1. domain (no dependencies)
RUN cd libs/domain && npm run build

# 2. contracts (depends on domain)
RUN cd libs/contracts && npm run build

# 3. database (depends on domain)
RUN cd libs/database && npm run build

# 4. shared (depends on domain)
RUN cd libs/shared && npm run build

# 5. backend API (depends on all libs)
RUN cd apps/server && npm run build

# ========================================
# Stage 3: Production - Runtime
# ========================================
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    postgresql-client \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/server/package*.json ./apps/server/
COPY libs/domain/package*.json ./libs/domain/
COPY libs/contracts/package*.json ./libs/contracts/
COPY libs/database/package*.json ./libs/database/
COPY libs/shared/package*.json ./libs/shared/

# Install ONLY production dependencies
RUN npm ci --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Copy compiled code from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/libs/domain/dist ./libs/domain/dist
COPY --from=builder /app/libs/contracts/dist ./libs/contracts/dist
COPY --from=builder /app/libs/database/dist ./libs/database/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

# Copy migration files (needed for runtime migrations)
COPY --from=builder /app/libs/database/migrations ./libs/database/migrations
COPY --from=builder /app/libs/database/knexfile.js ./libs/database/knexfile.js
COPY --from=builder /app/libs/database/scripts ./libs/database/scripts

# Copy entrypoint script
COPY apps/server/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set environment defaults
ENV NODE_ENV=production \
    NODE_MODE=hybrid \
    API_PORT=3001 \
    CACHE_BUST=2025-01-30-v6

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Run entrypoint script with app start command
CMD ["/usr/local/bin/docker-entrypoint.sh", "node", "apps/server/dist/main.js"]
