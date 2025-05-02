FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN corepack enable
RUN yarn install --immutable
COPY . .
ENV NITRO_HOST="0.0.0.0"
ENV NITRO_PORT="3000"
RUN yarn build
FROM node:20-alpine AS production
RUN apk add --no-cache sqlite
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN corepack enable
RUN yarn workspaces focus --production
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
