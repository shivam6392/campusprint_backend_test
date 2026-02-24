FROM node:18-slim

# No LibreOffice needed — conversion handled by CloudConvert API
WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

CMD ["node", "worker/index.js"]
