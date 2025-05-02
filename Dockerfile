FROM node:20-alpine AS builder

# Install SQLite and build dependencies
# RUN apk add --no-cache sqlite sqlite-dev build-base python3

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies
RUN corepack enable 
RUN yarn install --immutable

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:20-alpine AS production

# Install SQLite
RUN apk add --no-cache sqlite

# Set working directory
WORKDIR /app

# Copy package files for production dependencies
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN corepack enable 

# Install production dependencies only
RUN yarn workspaces focus --production

# Copy built application from builder stage
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/volume ./volume

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", ".output/server/index.mjs"]
