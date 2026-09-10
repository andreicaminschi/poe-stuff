export type Lake = {
  readJson<T>(key: string): Promise<T>;
  writeJson(key: string, value: unknown): Promise<void>;
  writeJsonAtomic(key: string, value: unknown): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<readonly string[]>;
  clear(prefix: string): Promise<void>;
};

export type LakeServiceOptions = {
  root?: string;
};
