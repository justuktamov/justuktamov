FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production DB_PATH=/data/analytika.db PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:${PORT}/api/health >/dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.js"]
