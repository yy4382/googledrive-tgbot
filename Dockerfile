# Build stage
FROM node:22-slim AS base

# Enable corepack for pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Dependencies stage
FROM base AS dependencies

# Install dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build stage  
FROM dependencies AS build

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm run build

# Production dependencies stage
FROM base AS prod-dependencies

# Install only production dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Production stage
FROM node:22-slim AS production

# Enable corepack for pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Create app directory
WORKDIR /app

# Create non-root user (matching telegram-bot-api uid/gid 101)
RUN groupadd --gid 101 nodejs \
  && useradd --uid 101 --gid nodejs --shell /bin/bash --create-home nodejs

# Create data directory and set permissions
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app

# Copy package.json for pnpm start command
COPY --chown=nodejs:nodejs package.json ./

# Copy production dependencies
COPY --from=prod-dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose port for OAuth callback
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Start the application
CMD ["pnpm", "start"]