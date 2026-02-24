FROM node:18-slim

# Install LibreOffice with Java support for reliable .docx to PDF conversion
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libreoffice \
    default-jre-headless \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-noto-core \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Pre-initialize LibreOffice user profile to avoid hang on first run
RUN mkdir -p /tmp/lo-init && \
    HOME=/tmp/lo-init soffice \
    --headless --norestore --nofirststartwizard \
    "-env:UserInstallation=file:///tmp/lo-init/profile" \
    --convert-to pdf /dev/null 2>/dev/null || true && \
    rm -rf /tmp/lo-init

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Worker entry point
CMD ["node", "worker/index.js"]
