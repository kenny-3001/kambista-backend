---
name: kambista-spec
description: Verifica el código de kambista-backend y kambista-frontend contra los requisitos del enunciado de la prueba técnica de Kambista y reporta qué está cumplido, qué falta y qué contradice el enunciado. Usar cuando se pida revisar cumplimiento del enunciado, del md o de la spec.
---

# Verificación contra el enunciado de Kambista

Fuente de verdad: el enunciado de la prueba técnica de Kambista (el archivo md entregado con la prueba). Si no tienes su ruta, pídesela al usuario. Léelo completo antes de verificar; si algo de esta lista difiere del enunciado, manda el enunciado.

## Cómo verificar

1. Lee el enunciado.
2. Para cada punto de la lista, busca evidencia en el código (archivo y línea). No marques nada como cumplido sin evidencia.
3. Si el backend está corriendo, prueba los endpoints reales; si no, apóyate en los tests.
4. Reporta una tabla: `Requisito | Estado (✅ / ⚠️ parcial / ❌ falta / 🚫 contradice) | Evidencia`.
5. Termina con la lista de lo pendiente, en orden de prioridad. No corrijas nada sin consultar al usuario.

## Lista de verificación

### Autenticación y roles
- [ ] `POST /v1/auth/register` con body `{ nombre, email, password }`.
- [ ] Rol por defecto siempre `user`; `admin` solo desde la base de datos (script de seed documentado).
- [ ] `POST /v1/auth/login` con body `{ email, password }`.
- [ ] Respuesta de login: `{ access_token, usuario: { id, nombre, email, rol } }` con esos nombres exactos.
- [ ] Endpoints de negocio exigen `Authorization: Bearer <token>`.
- [ ] `user` solo ve su historial; `admin` puede ver el de cualquiera.
- [ ] Contraseñas hasheadas (bcrypt u otro seguro).
- [ ] JWT con expiración razonable.
- [ ] Ninguna respuesta expone password ni hash.

### Tipo de cambio
- [ ] Consulta `GET https://api.apis.net.pe/v1/tipo-cambio-sunat` cada 30 segundos y lo guarda.
- [ ] Se usa el tipo de cambio guardado más reciente al calcular.

### Transacciones
- [ ] `POST /v1/transactions` con body `{ monedaOrigen, monedaDestino, monto }`.
- [ ] USD → PEN: `montoCambiado = monto * venta`.
- [ ] PEN → USD: `montoCambiado = monto / compra`.
- [ ] Respuesta: `{ id, monedaOrigen, monedaDestino, monto, montoCambiado, tipoCambio, fecha }`.

### Historial
- [ ] `GET /v1/transactions/history` con `startDate` y `endDate` obligatorios.
- [ ] `userId` opcional, solo efectivo para `admin`; sin él, admin ve el suyo; `user` siempre ve el suyo.
- [ ] Respuesta: arreglo de transacciones con el mismo formato.

### Validaciones del backend
- [ ] Error si no existe tipo de cambio registrado.
- [ ] Error si monedas de origen y destino son iguales.
- [ ] Error si el monto no es mayor a cero.

### Frontend
- [ ] Proyecto separado del backend, en Vue 3 o Nuxt.
- [ ] Pantallas de registro e inicio de sesión.
- [ ] Cerrar sesión desde cualquier pantalla protegida.
- [ ] Route guards: rutas de negocio solo con sesión activa.
- [ ] Formulario: monto, moneda que envía, moneda que recibe.
- [ ] Validaciones: sin campos vacíos, monedas distintas, máximo 2 decimales, máximo 7 dígitos enteros (9,999,999.99), mensajes de error claros.
- [ ] Historial filtrable por rango de fechas.
- [ ] Diseño cuidado y estados de carga, error y vacío.

### Stack y entrega
- [ ] Node.js + TypeScript, MongoDB, Clean Architecture + DDD.
- [ ] Pruebas unitarias y/o de integración.
- [ ] API documentada (Swagger).
- [ ] README por repo: descripción, requisitos, pasos para levantar, variables de entorno + `.env.example`, cómo correr las pruebas.
- [ ] Historial de commits ordenado y descriptivo.

### Extras senior (suman, no son obligatorios)
- [ ] Rate limiting de intentos fallidos de login.
- [ ] Refresh tokens.
- [ ] Historial paginado.
- [ ] Caché en memoria del tipo de cambio.
- [ ] Logging estructurado (usuario, endpoint, duración).
- [ ] Errores de dominio específicos y descriptivos.
- [ ] Tests E2E: registro → login → transacción → historial.
- [ ] Decisiones de arquitectura en el README.

### Mejoras propias acordadas (no deben contradecir el enunciado)
- [ ] `GET /v1/exchange-rate` para mostrar la tasa vigente en el frontend.
- [ ] Filtro por usuario en el historial del frontend cuando el rol es admin.
