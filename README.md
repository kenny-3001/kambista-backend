# Kambista — Backend

API de cambio de divisas **USD ⇄ PEN** con el tipo de cambio oficial de SUNAT. Consulta y guarda el tipo de cambio cada 30 segundos, registra operaciones de cambio y expone el historial de cada usuario, con autenticación JWT y roles `user` y `admin`.

Stack: NestJS 11, TypeScript (estricto), MongoDB 7 con Mongoose, Jest y Swagger. El frontend está en [kambista-frontend](https://github.com/kenny-3001/kambista-frontend).

## Requisitos

- Node.js 22 o superior.
- Docker, para MongoDB. Las pruebas no lo necesitan: usan una base de datos en memoria.

## Levantar en local

```bash
cp .env.example .env
docker compose up -d        # MongoDB 7 en localhost:27017
npm install
npm run start:dev
```

- API: `http://localhost:3000/v1`
- Documentación interactiva (Swagger): `http://localhost:3000/docs`

Al arrancar, la API consulta el tipo de cambio de SUNAT y lo vuelve a consultar cada 30 segundos. Si MongoDB no está disponible, falla en unos 20 segundos con un mensaje que indica cómo levantarlo.

### Usuario administrador

El registro público siempre asigna el rol `user`; el enunciado indica que el rol `admin` se gestiona desde la base de datos. Para crear un administrador (o promover a uno existente) con `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`:

```bash
npm run seed:admin
```

El comando es idempotente:

- Si el usuario no existe, se crea como `admin`.
- Si existe con rol `user`, se promueve a `admin`, su contraseña pasa a ser `ADMIN_PASSWORD` y se cierran sus sesiones abiertas. Así, si alguien registró ese email antes, pierde el acceso.
- Si ya es `admin`, no se cambia nada.

## Endpoints

Todas las rutas llevan el prefijo `/v1`. Las de negocio requieren `Authorization: Bearer <access_token>`.

| Método | Ruta                    | Autenticación | Descripción                                                      |
| ------ | ----------------------- | ------------- | ---------------------------------------------------------------- |
| POST   | `/auth/register`        | No            | Registra un usuario (`nombre`, `email`, `password`)              |
| POST   | `/auth/login`           | No            | Devuelve `access_token`, `refresh_token` y el usuario            |
| POST   | `/auth/refresh`         | No            | Renueva la sesión con el `refresh_token` (se puede usar una vez) |
| POST   | `/auth/logout`          | No            | Cierra la sesión del `refresh_token` enviado                     |
| GET    | `/exchange-rate`        | Sí            | Tipo de cambio vigente (extra para el formulario del frontend)   |
| POST   | `/transactions`         | Sí            | Registra un cambio (`monedaOrigen`, `monedaDestino`, `monto`)    |
| GET    | `/transactions/history` | Sí            | Historial por rango de fechas (`startDate`, `endDate`)           |

El detalle de cada campo, respuesta y error, con ejemplos, está en Swagger (`/docs`).

### Ejemplo del flujo completo

```bash
API=http://localhost:3000/v1

curl -s -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d '{"nombre":"Juan Pérez","email":"juan@example.com","password":"MiClave2024"}'

TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"juan@example.com","password":"MiClave2024"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).access_token')

curl -s -X POST $API/transactions -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"monedaOrigen":"USD","monedaDestino":"PEN","monto":100}'

curl -s "$API/transactions/history?startDate=2026-11-01&endDate=2026-11-30" \
  -H "Authorization: Bearer $TOKEN"
```

### Cálculo del cambio

- **USD → PEN:** `monto × venta`
- **PEN → USD:** `monto ÷ compra`

El resultado se redondea a 2 decimales hacia arriba en la mitad (`ROUND_HALF_UP`) con aritmética decimal: `155 × 3.739 = 579.545` da `579.55`, mientras que los números de JavaScript darían `579.54`.

### Historial

- `startDate` y `endDate` (obligatorios, `AAAA-MM-DD`) son días completos en hora de Perú y ambos se incluyen: del 18 al 18 devuelve todo el día 18.
- Las operaciones vienen de la más reciente a la más antigua.
- `userId` (opcional) solo lo respeta el rol `admin`; sin él, el admin ve su propio historial. El rol `user` siempre ve el suyo.
- **Siempre paginado**, nunca una lista sin límite: `page` (1 por defecto) y `limit` (20 por defecto, máximo 100). El cuerpo sigue siendo el arreglo del enunciado y el total del rango llega en la cabecera `X-Total-Count`.

### Errores

Todos los errores responden con el mismo formato:

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "El monto admite como máximo 2 decimales",
  "details": [
    { "field": "monto", "message": "El monto admite como máximo 2 decimales" }
  ]
}
```

`error` es un código estable para el frontend, `message` está en español y listo para mostrar, y `details` aparece solo en errores de validación, con el problema de cada campo. Los códigos principales:

| Estado | Códigos                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`, `SAME_CURRENCY`, `INVALID_AMOUNT`, `INVALID_HISTORY_PERIOD`, `INVALID_JSON` |
| 401    | `MISSING_ACCESS_TOKEN`, `INVALID_ACCESS_TOKEN`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`  |
| 404    | `ROUTE_NOT_FOUND`                                                                               |
| 409    | `EMAIL_ALREADY_REGISTERED`                                                                      |
| 413    | `PAYLOAD_TOO_LARGE`                                                                             |
| 415    | `UNSUPPORTED_MEDIA_TYPE`                                                                        |
| 429    | `TOO_MANY_LOGIN_ATTEMPTS` (con cabecera `Retry-After`)                                          |
| 503    | `EXCHANGE_RATE_NOT_AVAILABLE`: todavía no hay un tipo de cambio registrado                      |
| 500    | `INTERNAL_ERROR`: mensaje genérico; el detalle queda solo en el log                             |

## Variables de entorno

Se validan al arrancar: con un valor inválido, la API no inicia y explica cuál es.

| Variable                                      | Por defecto                                    | Descripción                                                        |
| --------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| `NODE_ENV`                                    | `development`                                  | `development`, `production` o `test`                               |
| `PORT`                                        | `3000`                                         | Puerto HTTP                                                        |
| `MONGO_URI`                                   | (obligatoria)                                  | Conexión a MongoDB                                                 |
| `CORS_ORIGIN`                                 | `http://localhost:5173`                        | Origen del frontend permitido                                      |
| `JWT_SECRET`                                  | (obligatoria)                                  | Mínimo 32 caracteres; el valor de ejemplo se rechaza en producción |
| `JWT_EXPIRES_IN`                              | `15m`                                          | Vida del access token (`900s`, `15m`, `1h`…)                       |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS`               | `7`                                            | Vida del refresh token, de 1 a 90 días                             |
| `LOGIN_MAX_FAILED_ATTEMPTS`                   | `5`                                            | Logins fallidos permitidos por email e IP dentro de la ventana     |
| `LOGIN_ATTEMPTS_WINDOW_MINUTES`               | `15`                                           | Duración de la ventana de intentos                                 |
| `EXCHANGE_RATE_API_URL`                       | `https://api.apis.net.pe/v1/tipo-cambio-sunat` | Proveedor del tipo de cambio                                       |
| `EXCHANGE_RATE_REFRESH_INTERVAL_MS`           | `30000`                                        | Cada cuánto se consulta y guarda el tipo de cambio                 |
| `EXCHANGE_RATE_TIMEOUT_MS`                    | `5000`                                         | Tiempo máximo de espera al proveedor                               |
| `LOG_FORMAT`                                  | `json` en producción, `pretty` en desarrollo   | `json`: un objeto por línea; `pretty`: legible en la terminal      |
| `LOG_LEVEL`                                   | `log`                                          | Nivel mínimo: `error`, `warn`, `log`, `debug` o `verbose`          |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | —                                              | Solo para `npm run seed:admin`                                     |

## Pruebas

```bash
npm test             # unitarias y de integración
npm run test:e2e     # end-to-end
npm run test:cov     # unitarias con reporte de cobertura
```

Ninguna necesita Docker ni toca la base de datos del `.env`: las que usan MongoDB levantan una instancia en memoria (`mongodb-memory-server`, MongoDB 7). La primera ejecución descarga el binario.

- **Unitarias:** dominio y casos de uso con dobles en memoria, sin Nest ni MongoDB.
- **Integración:** repositorios contra MongoDB en memoria, y controladores, guards y filtros a través de HTTP.
- **End-to-end:** la aplicación completa, configurada como en producción, recorre el flujo del enunciado (registro → login → cambio → historial), los roles, las validaciones, la sesión, el límite de intentos y los logs. El único doble es el proveedor de SUNAT, para no depender del servicio externo y tener un tipo de cambio fijo con el que verificar los cálculos.

## Scripts

| Comando              | Qué hace                                            |
| -------------------- | --------------------------------------------------- |
| `npm run start:dev`  | Servidor de desarrollo, se reinicia al guardar      |
| `npm run build`      | Compila a `dist/`                                   |
| `npm run start:prod` | Ejecuta el build (`node dist/main`)                 |
| `npm run seed:admin` | Crea o promueve el usuario administrador            |
| `npm run lint`       | ESLint, corrigiendo lo que se pueda automáticamente |
| `npm run format`     | Prettier                                            |

## Arquitectura

Clean Architecture con DDD, organizada por módulos de negocio:

```
src/
├── modules/
│   ├── auth/            # usuarios, login, tokens, roles, límite de intentos
│   ├── exchange-rate/   # consulta a SUNAT, guardado y caché del tipo de cambio
│   └── transactions/    # operaciones de cambio e historial
├── shared/              # errores de dominio, filtro de errores, validación, logging, Swagger
├── configure-app.ts     # configuración HTTP común a main.ts y a las pruebas E2E
└── main.ts
```

Cada módulo se divide en capas, y las dependencias apuntan hacia adentro:

- **`domain`:** entidades, value objects (`Amount`, `CurrencyPair`, `HistoryPeriod`, `Email`…), reglas y errores de negocio. No conoce NestJS, Mongoose ni HTTP.
- **`application`:** casos de uso como clases planas y los puertos (clases abstractas) que necesitan: repositorios, proveedor de tipo de cambio, servicio de tokens.
- **`infrastructure`:** las implementaciones de esos puertos (Mongo, bcrypt, JWT, apis.net.pe, el programador de cada 30 s).
- **`presentation`:** controladores, DTOs con validación, guards y decoradores.

Los casos de uso se conectan a sus implementaciones en el módulo de Nest con `useFactory`, así la capa de aplicación no depende del framework y se prueba sin él. Los errores de negocio heredan de `DomainError` con un código y una categoría, y un filtro global los traduce a HTTP.

## Decisiones de diseño

### Tipo de cambio

- Se consulta al arrancar y cada 30 segundos, sin solapar consultas, y **se guarda cada consulta**: el enunciado pide obtenerlo y guardarlo cada 30 segundos.
- Para calcular se usa **siempre el último tipo guardado, sin límite de antigüedad**, como pide el enunciado. Si SUNAT falla, la API sigue funcionando con el último valor y registra un aviso. Sin ningún tipo guardado, un cambio responde `503 EXCHANGE_RATE_NOT_AVAILABLE`.
- Antes de guardar se valida lo que responde el proveedor: compra y venta mayores a cero, venta mayor o igual a compra, moneda USD y fecha válida.
- El último tipo vive en una **caché en memoria** (un decorador sobre el repositorio de Mongo): leerlo no consulta la base. Cada instancia del API tiene su propia caché, actualizada por su propio programador; con varias instancias convendría una caché compartida como Redis.

### Montos

- Aritmética decimal (`decimal.js`), nunca números de punto flotante.
- El monto debe ser un número (no un texto), mayor a cero, con hasta 2 decimales y hasta 9,999,999.99.
- Se rechaza un monto cuyo resultado redondea a cero (`INVALID_AMOUNT`), por ejemplo S/ 0.01 → $ 0.00.

### Autenticación y sesión

- Contraseñas con bcrypt (de 8 a 72 bytes, el límite real de bcrypt). Nunca se devuelven ni se registran.
- Un login con un email inexistente también calcula un hash antes de responder `401`: el tiempo de respuesta no revela qué emails están registrados.
- **Access token JWT de 15 minutos** (HS256, con expiración obligatoria). Lleva el id, el email y el rol, y no se consulta la base en cada petición: si a alguien se le quita el rol admin, lo pierde cuando su token vence.
- **Refresh token opaco de 7 días**, guardado como hash SHA-256. Cada uso entrega uno nuevo (rotación); **reusar uno ya usado cierra toda esa sesión**, porque indica un posible robo. Por eso un cliente debe renovar una sola vez a la vez: dos renovaciones simultáneas con el mismo token se verían como reuso. El frontend las serializa, también entre pestañas.
- **Cerrar sesión revoca el refresh token, pero el access token ya emitido sigue siendo válido hasta vencer** (15 minutos como máximo): es un JWT sin estado.
- Todo endpoint nace protegido: el guard JWT es global y solo las rutas marcadas `@Public()` (las de `/auth`) quedan abiertas.
- La regla de administrador del historial se aplica en el caso de uso: el `userId` que envía un `user` se ignora y ve su propio historial, sin error. También hay un guard de roles global, listo para rutas exclusivas de admin con `@Roles()` (responderían `403 INSUFFICIENT_PERMISSIONS`); hoy ninguna lo necesita.

### Límite de intentos de login

- Tras **5 logins fallidos por email e IP en 15 minutos**, se responde `429 TOO_MANY_LOGIN_ATTEMPTS` con `Retry-After`, incluso con la contraseña correcta. Un login exitoso reinicia el contador.
- La clave es email + IP: un atacante no puede bloquear a la víctima desde otra dirección ni probar muchas contraseñas desde la suya. El contador es atómico en MongoDB (no se puede esquivar con peticiones simultáneas) y se borra solo al vencer.

### Logging

- Una línea por petición con método, ruta (sin la query), estado, duración, usuario e **ID de petición**. El ID se devuelve en la cabecera `X-Request-Id` y acompaña a los errores 500 en el log, para encontrar un error a partir de lo que reporta un usuario.
- En producción cada línea es un objeto JSON, listo para un recolector de logs.
- Nunca se registran cuerpos, cabeceras ni tokens.
- Los errores inesperados responden un `500` genérico y su detalle queda solo en el log.

## Antes de llevarlo a producción

- **Detrás de un proxy o balanceador**, hay que configurar `trust proxy` de Express. Si no, todas las peticiones llegan con la IP del proxy y el límite de intentos sería por email para todos los clientes a la vez.
- **El límite por IP es aproximado:** usuarios detrás de una misma IP (una oficina, una red móvil) comparten el contador de cada email, y en IPv6 un atacante puede cambiar de dirección con facilidad. Un siguiente paso sería limitar también por rangos de red o agregar un captcha.
- **Varias instancias del API** consultarían SUNAT cada una por su cuenta y tendrían su propia caché.
- **`npm audit` informa avisos moderados** en `glob` y `minimatch`, que llegan a través de `@nestjs/cli` y `jest`: solo dependencias de desarrollo. `npm audit --omit=dev` no encuentra ninguno. npm solo los corrige con cambios de versión mayor (`@nestjs/cli` 12 y `jest` 29), que no se aplicaron por avisos que no llegan a producción.
