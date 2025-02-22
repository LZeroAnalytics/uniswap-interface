# =============================
# 1. Builder Stage
# =============================
FROM node:20-alpine AS builder

# Set a working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) first
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy the rest of the files
COPY . .

# Build the Next.js application
RUN npm run build

# =============================
# 2. Production Stage
# =============================
FROM node:20-alpine AS production

# Set NODE_ENV to production
ENV NODE_ENV production

# Create a working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the build output from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

# Expose port 3000
EXPOSE 3000

# Start the Next.js server
CMD ["npm", "start"]