FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=4002
EXPOSE 4002

# run as the non-root user that comes with the node image
USER node

CMD ["node", "src/index.js"]
