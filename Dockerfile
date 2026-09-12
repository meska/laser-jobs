FROM node:24.13.1 as build-stage
ENV NODE_OPTIONS=--openssl-legacy-provider

ARG APP_DB_URL=/db
ARG APP_SENTRY_DSN
ENV VUE_APP_DB_URL=$APP_DB_URL
ENV VUE_APP_SENTRY_DSN=$APP_SENTRY_DSN

WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --ignore-engines
COPY ./ .
COPY public/index.html public/index.html
RUN npm run build

FROM nginx as production-stage
RUN mkdir /app
COPY --from=build-stage /app/dist /app
COPY nginx/nginx.conf /etc/nginx/nginx.conf
