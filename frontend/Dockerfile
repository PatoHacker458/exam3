# ============================================================================
# Etapa 1: Desarrollo (usada por docker-compose.yml en puerto 5173)
# ============================================================================
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ============================================================================
# Etapa 2: Construcción de Producción (Bundle estático optimizado con Vite)
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ============================================================================
# Etapa 3: Servidor de Producción con Nginx y soporte SPA Routing
# ============================================================================
FROM nginx:1.27-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

