FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.mjs ./

EXPOSE 8079
CMD ["node", "server.mjs"]
