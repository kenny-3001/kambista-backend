# Kambista Backend

API de cambio de divisas (USD ⇄ PEN) con autenticación JWT, construida con NestJS, TypeScript y MongoDB.

> Documentación en construcción.

## Requisitos previos

- Node.js 22
- npm
- Docker (para levantar MongoDB)

## Levantar en local

```bash
cp .env.example .env
docker compose up -d
npm install
npm run start:dev
```

La API queda disponible en `http://localhost:3000/v1`.

## Usuario administrador

El registro público siempre asigna el rol `user`. Para crear un administrador (o promover a uno existente) usa las variables `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env` y ejecuta:

```bash
npm run seed:admin
```

El comando es idempotente: si el usuario ya existe, solo se le asigna el rol `admin` sin cambiar su contraseña.
