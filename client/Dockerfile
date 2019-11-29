FROM node:11-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json yarn.lock /usr/src/app/

RUN yarn global add cross-env
RUN yarn install

COPY . .

RUN yarn build

