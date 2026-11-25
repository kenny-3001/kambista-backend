---
name: kambista-commit
description: Prepara un commit en kambista-backend o kambista-frontend - muestra los cambios, propone un mensaje en formato Conventional Commits y solo hace el commit cuando el usuario lo aprueba explícitamente. Usar cuando se pida hacer o preparar un commit.
---

# Commit con aprobación

Regla principal: **nunca hagas commit ni push sin la aprobación explícita del usuario en este turno.**

## Pasos

1. **Muestra el estado.** Ejecuta `git status` y `git diff --stat` en el repo correspondiente. Lista los archivos que entrarían al commit.
2. **Verifica que no se cuele nada indebido.** Nada de `.env`, credenciales, `node_modules`, `dist` ni `coverage`. Si aparece algo, detente y avisa.
3. **Agrupa.** Si los cambios mezclan temas distintos, propone dividirlos en varios commits.
4. **Propón el mensaje** con Conventional Commits, en inglés, en modo imperativo:
   - Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `style`, `perf`, `ci`.
   - Formato: `tipo(alcance): descripción corta` (máximo ~72 caracteres), y si hace falta un cuerpo breve explicando el porqué.
   - Ejemplos: `feat(auth): add user registration with bcrypt hashing`, `test(transactions): cover USD/PEN conversion rules`.
   - **No agregues trailers automáticos** (como `Co-Authored-By`): el mensaje lleva solo el título y, si hace falta, el cuerpo.
5. **Pide aprobación.** Muestra el mensaje y los archivos y pregunta: "¿Hago el commit?". Espera la respuesta.
6. **Solo si el usuario aprueba:** `git add` de los archivos listados (por nombre, no `git add -A` a ciegas) y `git commit`. Muestra el resultado con `git log --oneline -1`.
7. **Push:** nunca como parte de esta skill. Si el usuario quiere subir los cambios, confírmalo por separado.
