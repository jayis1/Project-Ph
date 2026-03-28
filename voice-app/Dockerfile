FROM node:20-slim

# Install ffmpeg for audio resampling (24kHz Kokoro → 8kHz telephony)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies without relying on package-lock.json (handles vfs bugs gracefully)
COPY package*.json ./
RUN rm -rf node_modules package-lock.json && \
    npm cache clean --force && \
    npm install --verbose || cat /root/.npm/_logs/*-debug.log

# Copy application code
COPY . .

# Create audio directory
RUN mkdir -p /app/audio

# HTTP API port
EXPOSE 3000
# WebSocket for audio streaming
EXPOSE 3001

CMD ["node", "index.js"]
