/** Reads the endpoint config from `packages/etl/.env`. Nothing else may touch `process.env`. */

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing ${name}. Run with: node --env-file=packages/etl/.env packages/etl/tools/<tool>.ts`,
    );
  }
  return value;
}
