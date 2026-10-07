FROM node:20-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
ENV AUTH_DIR=/data/auth
VOLUME ["/data"]
EXPOSE 3100
CMD ["node", "index.js"]
