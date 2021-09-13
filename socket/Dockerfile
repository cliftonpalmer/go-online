FROM node:16.9-alpine

WORKDIR /usr/src/app

RUN npm install mariadb express express-ws
COPY server.js db.js ./

EXPOSE 3000
CMD [ "node", "server.js" ]
