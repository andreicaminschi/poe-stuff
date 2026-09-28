import { resolve } from "node:path";

export const repoRoot = (appPath: string): string => resolve(appPath, "..", "..");
