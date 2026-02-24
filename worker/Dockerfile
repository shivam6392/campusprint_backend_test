FROM node:18-slim

# Install LibreOffice with Java support
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libreoffice \
    default-jre-headless \
    fonts-liberation \
    fonts-dejavu-core \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Pre-initialize LibreOffice user profile into /root at build time.
# This bakes the profile into the image layer so LibreOffice never needs
# to do first-run initialization at job time (prevents hanging).
RUN mkdir -p /root && \
    HOME=/root soffice \
        --headless --norestore --nofirststartwizard \
        --version 2>/dev/null || true

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

CMD ["node", "worker/index.js"]
