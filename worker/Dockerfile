FROM node:18-slim

# Install LibreOffice (headless) for document conversion
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    fonts-liberation \
    fonts-dejavu-core && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the full backend (worker needs models, config, .env access)
COPY package*.json ./
RUN npm install --production

COPY . .

# Worker entry point
CMD ["node", "worker/index.js"]
