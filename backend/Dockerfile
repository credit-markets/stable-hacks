FROM --platform=linux/amd64 node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm@latest
RUN pnpm install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port and start
EXPOSE 3030
CMD ["node", "dist/main.js"]