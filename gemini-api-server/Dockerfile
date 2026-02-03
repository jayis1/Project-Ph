FROM node:20-slim

# Install system dependencies
# python3/pip might be needed by some CLI tools or bindings, keeping it minimal for now
RUN apt-get update && apt-get install -y \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Google Gemini CLI globally
RUN npm install -g @google/gemini-cli

WORKDIR /app

# Copy package files
COPY package.json ./

# Install app dependencies
RUN npm install --production

# Copy app source
COPY server.js structured.js ./

# Set environment to production
ENV NODE_ENV=production

# Expose the API port
EXPOSE 3333

# Start the server
CMD ["node", "server.js"]
