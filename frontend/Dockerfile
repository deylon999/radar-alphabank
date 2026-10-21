# Сборка: Node из .nvmrc, зависимости строго по package-lock.json.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
# Режим данных задаётся при сборке: Vite встраивает переменные в бандл.
ARG VITE_USE_MOCKS=true
ARG VITE_API_URL=http://localhost:8000
ENV VITE_USE_MOCKS=$VITE_USE_MOCKS VITE_API_URL=$VITE_API_URL
RUN npm run build

# Раздача: статический nginx, SPA-маршруты отдают index.html.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
