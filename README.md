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

El comando es idempotente:

- Si el usuario no existe, se crea como `admin`.
- Si existe con rol `user`, se promueve a `admin` y su contraseña pasa a ser `ADMIN_PASSWORD`. Así, si alguien registró ese email antes, pierde el acceso.
- Si ya es `admin`, no se cambia nada.
