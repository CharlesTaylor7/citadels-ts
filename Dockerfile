FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable
RUN yarn install --immutable
COPY . .
# force IPv4 host instead of IPv6
ENV NITRO_HOST="0.0.0.0"
ENV NITRO_PORT="3000"
ARG COMMIT_SHA
ENV VITE_COMMIT_SHA=${COMMIT_SHA}
RUN yarn build
FROM node:20-alpine AS production
RUN apk add --no-cache sqlite
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
