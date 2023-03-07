FROM node:18 as build-stage
ENV NODE_OPTIONS=--openssl-legacy-provider

WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install
COPY ./ .
COPY public/index.html public/index.html
RUN npm run build

FROM nginx as production-stage
RUN mkdir /app
COPY --from=build-stage /app/dist /app
COPY nginx/nginx.conf /etc/nginx/nginx.conf