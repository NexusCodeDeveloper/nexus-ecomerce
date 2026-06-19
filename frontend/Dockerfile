# Usa una imagen base de Node.js
FROM node:20-alpine

# Instala pnpm globalmente
RUN npm install -g pnpm

# Establece el directorio de trabajo en el contenedor
WORKDIR /app

# Copia los archivos de manifiesto del paquete y el lockfile
COPY package.json pnpm-lock.yaml ./

# Instala las dependencias
RUN pnpm install --frozen-lockfile

# Copia el resto de los archivos de la aplicación
COPY . .

# Expone el puerto que Vite usa para el servidor de desarrollo
EXPOSE 5173

# El comando para iniciar la aplicación en modo de desarrollo
CMD ["pnpm", "run", "dev", "--host"]