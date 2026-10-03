/** Formats the id of a seeder. Seeder names repeat across categories. Low, Sonar 0. */
export const formatSeederKey = (category: string, seeder: string): string => `${category}\u0000${seeder}`;

/** Reads the category a seeder id belongs to. Low, Sonar 0. */
export const readSeederCategory = (key: string): string => key.split("\u0000")[0] ?? "";

/** Reads the seeder name out of a seeder id. Low, Sonar 0. */
export const readSeederName = (key: string): string => key.split("\u0000")[1] ?? "";
