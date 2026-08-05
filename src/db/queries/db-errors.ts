// Drizzle wraps the driver's Postgres error in a DrizzleQueryError, with the
// actual pg error (carrying `.code` / `.constraint`) nested one level down in
// `.cause` rather than on the thrown error itself. Walk `.cause` so callers
// checking for a specific Postgres error code don't silently miss it and let
// the raw exception crash the request.
function findPgErrorField(error: unknown, field: "code" | "constraint"): string | undefined {
  let current = error;
  for (let depth = 0; depth < 5 && current !== null && typeof current === "object"; depth++) {
    const value = (current as Record<string, unknown>)[field];
    if (typeof value === "string") return value;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export function isForeignKeyViolation(error: unknown): boolean {
  return findPgErrorField(error, "code") === "23503";
}

export function isUniqueViolation(error: unknown): boolean {
  return findPgErrorField(error, "code") === "23505";
}

/** Name of the violated constraint (e.g. "operators_vat_unique"), when the driver surfaces one. */
export function violatedConstraint(error: unknown): string | null {
  return findPgErrorField(error, "constraint") ?? null;
}
