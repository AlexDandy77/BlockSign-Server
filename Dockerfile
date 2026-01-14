# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
COPY openapi.yaml ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["npm", "start"]