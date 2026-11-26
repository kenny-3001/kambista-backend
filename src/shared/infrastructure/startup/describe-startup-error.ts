/**
 * Turns the usual startup failures into a short, actionable message instead
 * of a raw stack trace. Shared by the API and the seed script.
 */
export function describeStartupError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof Error && error.name.startsWith('MongooseServer')) {
    return `No se pudo conectar a MongoDB (${message}). ¿Está levantado? Ejecuta: docker compose up -d`;
  }
  if ((error as { code?: unknown } | null)?.code === 'EADDRINUSE') {
    return `El puerto ya está en uso (${message}). Cambia PORT en el .env o detén el otro proceso`;
  }
  return `No se pudo iniciar: ${message}`;
}
