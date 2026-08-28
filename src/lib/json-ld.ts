/**
 * Serializes structured data for a `<script type="application/ld+json">` tag.
 * JSON.stringify doesn't escape "<", so a value containing "</script>" could
 * close the tag early and let a following string be parsed as new markup --
 * escape it so the tag's content can never break out of its own script
 * context, regardless of what ends up in the data (e.g. a city name).
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
