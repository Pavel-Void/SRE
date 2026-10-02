FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --force

COPY . .

ENV NODE_OPTIONS=--max-old-space-size=512

RUN npm run build

FROM node:18-slim

ENV NEXT_PUBLIC_API_URL=https://yumparking.tech:443

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
