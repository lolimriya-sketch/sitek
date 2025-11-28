### Multi-stage Dockerfile for Next.js app (production)
# Builds the app and runs `pnpm start` in production mode.

FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy package files first to leverage Docker cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY .npmrc ./ 2>/dev/null || true

RUN pnpm install --frozen-lockfile

# Copy the rest of the source
COPY . .

# Build the Next.js app
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@8

# Copy built app from builder
COPY --from=builder /app .

ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Persist the data directory as a volume (so `data/db.json` can be mounted)
VOLUME ["/app/data"]

# Start the Next.js production server
CMD ["pnpm", "start"]
