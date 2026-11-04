FROM node:20-alpine

WORKDIR /app

# Instalar dependencias primero para aprovechar caché de capas Docker
COPY package*.json ./
RUN npm install --omit=dev

# Copiar código fuente del backend
COPY src ./src

# Usuario sin privilegios de root por seguridad
USER node

EXPOSE 4000

CMD ["npm", "start"]

