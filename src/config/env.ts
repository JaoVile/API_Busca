export function validateEnv(): void {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'];
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}
