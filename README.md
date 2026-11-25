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
