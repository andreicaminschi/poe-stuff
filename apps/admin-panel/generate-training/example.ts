import type { Faker } from "@faker-js/faker";
import type { StateCommand } from "../commands.ts";
import type { PanelState } from "../types.ts";

export type Form = "single" | "bulk" | "listed" | "offTopic" | "unknownName" | "vague";

/** `seen` trains and evaluates. `unseen` only evaluates, so its wordings never reach training. */
export type PatternSet = "seen" | "unseen";

/** One generated request: the query, the names its context describes, and the commands that solve it. */
export type Example = {
  readonly goal: string;
  readonly form: Form;
  readonly query: string;
  readonly names: readonly string[];
  readonly commands: readonly StateCommand[];
  /** True when the right answer is to ask the user to rephrase. `commands` is empty then. */
  readonly unclear?: boolean;
};

export type BuildExample = (faker: Faker, state: PanelState) => Example;

export type TargetSeeder = { readonly category: string; readonly seeder: string };

export type TargetItem = { readonly seeder: string; readonly item: string };

/** Fills `{key}` placeholders. Low, Sonar 0. */
export const render = (pattern: string, values: Readonly<Record<string, string>>): string =>
  pattern.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? `{${key}}`);

/** Joins names as a listed target: `A, B and C`. Low, Sonar 1. */
export const joinNames = (names: readonly string[]): string =>
  names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;

export const listFilledCategories = (state: PanelState): readonly string[] =>
  state.categories.filter((category) => category.seeders.length > 0).map((category) => category.name);

export const listEmptyCategories = (state: PanelState): readonly string[] =>
  state.categories.filter((category) => category.seeders.length === 0).map((category) => category.name);

export const listSeeders = (state: PanelState): readonly TargetSeeder[] =>
  state.categories.flatMap((category) => category.seeders.map((seeder) => ({ category: category.name, seeder: seeder.name })));

/** Lists every base type with the seeder holding it. Low, Sonar 0. */
export const listItems = (state: PanelState): readonly TargetItem[] =>
  state.categories.flatMap((category) => category.seeders.flatMap((seeder) =>
    (seeder.conditions["BaseType"] ?? []).filter((value): value is string => typeof value === "string").map((item) => ({ seeder: seeder.name, item }))));

/** Picks 2-4 entries, as many as there are. Low, Sonar 0. */
export const pickListed = <T>(faker: Faker, entries: readonly T[]): readonly T[] =>
  faker.helpers.arrayElements(entries, { min: Math.min(2, entries.length), max: Math.min(4, entries.length) });
