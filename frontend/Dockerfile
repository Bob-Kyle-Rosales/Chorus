# Frontend Dockerfile
# Builds a production-ready container for the Chorus Next.js app.
#
# Build stages:
#   Stage 1 (deps)    — installs node_modules
#   Stage 2 (builder) — runs next build, produces the standalone output
#   Stage 3 (runner)  — minimal image with only the built output
#
# Why three stages?
#   node_modules is huge (~500MB). The final image only needs the compiled
#   output from `next build --output standalone`, which is much smaller.
#   Separating the stages keeps the production image lean.

# ---------------------------------------------------------------------------
# Stage 1: deps — install node_modules
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Install pnpm via corepack (built into Node.js — no extra install needed)
RUN corepack enable pnpm

# Copy package files first for layer caching (same reason as backend Dockerfile)
COPY package.json pnpm-lock.yaml ./

# Install exact versions from the lockfile
# --ignore-scripts skips native binary builds (sharp, unrs-resolver).
# sharp is optional for Next.js image optimization — a JS fallback is used instead.
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---------------------------------------------------------------------------
# Stage 2: builder — compile the Next.js app
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable pnpm

# Copy installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Build the Next.js app.
# Because next.config.ts has output: "standalone", this produces:
#   .next/standalone/  — a self-contained server with minimal dependencies
#   .next/static/      — static assets (JS, CSS, images)
RUN pnpm build

# ---------------------------------------------------------------------------
# Stage 3: runner — minimal production image
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Set production mode — disables dev-only features and enables optimizations
ENV NODE_ENV=production

# Copy the standalone server output from the builder stage.
# This is a minimal Node.js server that doesn't need node_modules.
COPY --from=builder /app/.next/standalone ./

# Copy static assets separately — they're served directly by the server
COPY --from=builder /app/.next/static ./.next/static

# Copy the public/ folder (images, icons, etc.)
COPY --from=builder /app/public ./public

# The port Next.js listens on inside the container
EXPOSE 3000

# Start the standalone Next.js server
CMD ["node", "server.js"]
