import type { Spectre } from "./types.ts";

/**
 * The whole `Spectres.json` file: one entry per raisable monster, keyed by its metadata id
 * such as `Metadata/Monsters/Axis/AxisCaster`. There is no envelope — the file is the
 * record.
 */
export type Spectres = Record<string, Spectre>;
