FROM node:8

WORKDIR api

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]