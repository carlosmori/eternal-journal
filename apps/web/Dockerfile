FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN corepack enable && yarn install --immutable
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ARG NEXT_PUBLIC_ADMIN_EMAIL
RUN cd apps/web && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
