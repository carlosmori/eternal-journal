FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/api/prisma apps/api/prisma/
RUN corepack enable && yarn install --immutable
COPY apps/api apps/api
RUN cd apps/api && npx prisma generate && npx nest build

FROM node:20-alpine AS runner
WORKDIR /app
ARG APP_VERSION=unknown
ENV NODE_ENV=production
ENV APP_VERSION=${APP_VERSION}
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
