FROM node:10.15-alpine
RUN apk add --no-cache sqlite
COPY . /thecollective
WORKDIR /thecollective
RUN yarn
CMD node ./db/service.js

