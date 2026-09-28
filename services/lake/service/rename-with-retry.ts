import { rename } from "node:fs/promises";

const isWindowsLock = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException).code;
  return code === "EPERM" || code === "EACCES";
};

export const renameWithRetry = async (from: string, to: string, attempt = 0): Promise<void> => {
  try {
    await rename(from, to);
  } catch (error) {
    if (!isWindowsLock(error) || attempt >= 20) throw error;
    await new Promise((done) => setTimeout(done, 5 * (attempt + 1)));
    await renameWithRetry(from, to, attempt + 1);
  }
};
