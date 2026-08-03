export function getSessionSecret(environmentVariable: string, developmentFallback: string): string {
  const configuredSecret = process.env[environmentVariable];
  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${environmentVariable} is required in production`);
  }
  return developmentFallback;
}
