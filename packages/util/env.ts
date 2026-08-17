/**
 * Reading `process.env` belongs here and nowhere else. Every package loads its own
 * `packages/<name>/.env` via `node --env-file=`; this only reads what that put there.
 */

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

export function requireEnv(name: string): string {
  const value = optionalEnv(name);
  if (value === undefined) {
    throw new Error(
      `Missing ${name}. Run with: node --env-file=packages/<name>/.env <script>`,
    );
  }
  return value;
}
