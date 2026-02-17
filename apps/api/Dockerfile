FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma/
RUN corepack enable && yarn install --frozen-lockfile
COPY apps/api apps/api
RUN cd apps/api && npx prisma generate && npx nest build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
