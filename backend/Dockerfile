# Runs the Express API on Google Cloud Run.
# Cloud Run injects PORT (default 8080) and server.js already reads
# process.env.PORT, so no code changes were needed for this to work.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first so this layer is cached when only source changes
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# Cloud Run sets PORT itself; this default only matters for `docker run` locally
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/server.js"]
