---
name: kambista-revisar
description: Revisa la parte en curso de kambista-backend o kambista-frontend antes de hacer commit - compila, corre lint y pruebas, revisa los cambios y entrega un resumen. Usar cuando se pida revisar la parte actual, validar los cambios o antes de proponer un commit.
---

# Revisión de la parte actual

Objetivo: que nada llegue a un commit sin estar verificado. Esta skill solo revisa y reporta; no hace commits ni corrige sin consultar al usuario.

## Pasos

1. **Identifica el repo y los cambios.** Determina si se trabaja en `kambista-backend` o `kambista-frontend` y ejecuta `git status` y `git diff` (incluye archivos nuevos sin seguimiento).
2. **Compila.** Backend: `npm run build`. Frontend: `npm run build` (incluye chequeo de tipos si está configurado).
3. **Lint y formato.** Solo verificar, sin modificar archivos: `npx eslint "{src,test}/**/*.ts"` (sin `--fix`, porque `npm run lint` corrige solo) y `npx prettier --check "{src,test}/**/*.ts"`. Reporta errores; no los arregles sin consultar.
4. **Pruebas.** `npm test` (y `npm run test:e2e` si la parte toca flujos completos). Reporta cuántas pasan o fallan, con la salida de los errores.
5. **Revisión del código.** Lee los archivos cambiados buscando:
   - errores de lógica y casos borde (montos, fechas, zonas horarias, redondeo);
   - respeto de las capas (el dominio no importa NestJS, Mongoose ni Vue);
   - nombres de campos de la API exactamente como en el enunciado;
   - datos sensibles expuestos (password, hash, secretos en el código);
   - código muerto, duplicado o `console.log` olvidados.
   Si la parte toca autenticación o seguridad, además sigue el enfoque de la skill `security-review`.
6. **Cumplimiento.** Contrasta lo hecho con los puntos del enunciado que afecta esta parte (ver skill `kambista-spec`).
7. **Archivos que no deben subirse.** Confirma que `.env`, `node_modules`, `dist` y `coverage` estén ignorados y no aparezcan en los cambios.

## Reporte final

Entrega un resumen corto en español:

- **Compilación / Lint / Pruebas:** ✅ o ❌ con el detalle.
- **Problemas encontrados:** lista ordenada por gravedad, con `archivo:línea`.
- **Cumplimiento del enunciado:** qué cubre esta parte.
- **Veredicto:** "Lista para commit" o "Requiere cambios".

Si el veredicto es "Lista para commit", sugiere usar `/kambista-commit`.
