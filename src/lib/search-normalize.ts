/**
 * Produces a comparison-only version of user-entered place names.
 * This keeps the displayed spelling intact while making searches such as
 * "Tirane" and "Tiranë" equivalent (and does the same for every diacritic).
 */
export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}
