import type { Faker } from "@faker-js/faker";
import { executeCommand, type StateCommand } from "../../commands.ts";
import { CONDITION_FORMATS, expandCommand } from "../../condition-values.ts";
import { formatContext } from "../../format-context.ts";
import type { PanelState } from "../../types.ts";
import type { Example } from "../example.ts";
import { drawCategoryName, drawSeederName, listTakenNames } from "../fake-panel/build-state.ts";
import { listEmptyCategories, listFilledCategories, listItems, listSeeders } from "../example.ts";
import type { StopRow } from "./play-example.ts";

const STAMP = { id: "generated", at: "1970-01-01T00:00:00.000Z", actor: "generator" };

/** Any value from `values` but `not`, or undefined when there is none. Low, Sonar 1. */
function pickOther<T>(faker: Faker, values: readonly T[], not: (value: T) => boolean): T | undefined {
  const others = values.filter((value) => !not(value));
  return others.length === 0
    ? undefined
    : faker.helpers.arrayElement(others);
}

/**
 * A plausible wrong attempt at `command`: the sibling command that is easy to confuse with it,
 * or the same command aimed at another target on the panel. Undefined when the panel offers
 * none. Low, Sonar 5.
 */
function drawWrongCommand(faker: Faker, state: PanelState, command: StateCommand): StateCommand | undefined {
  switch (command.type) {
    case "mergeCategory": return { type: "moveSeeders", targets: { category: command.category }, toCategory: command.into };
    case "moveSeeders": return "category" in command.targets
      ? { type: "mergeCategory", category: command.targets.category, into: command.toCategory }
      : undefined;
    case "updateSeeder":
    case "deleteSeeder":
    case "moveSeeder": {
      const other = pickOther(faker, listSeeders(state), (at) => at.seeder === command.seeder);
      return other === undefined
        ? undefined
        : { ...command, category: other.category, seeder: other.seeder };
    }
    case "updateItems": {
      const other = pickOther(faker, listItems(state), (at) => command.items.includes(at.item));
      return other === undefined
        ? undefined
        : { ...command, items: [other.item] };
    }
    case "updateSeeders":
    case "deleteSeeders": {
      if (!("category" in command.targets)) return undefined;
      const current = command.targets.category;
      const other = pickOther(faker, listFilledCategories(state), (name) => name === current);
      return other === undefined
        ? undefined
        : { ...command, targets: { category: other } };
    }
    case "deleteCategory": {
      const other = pickOther(faker, listEmptyCategories(state), (name) => command.names.includes(name));
      return other === undefined
        ? undefined
        : { ...command, names: [other] };
    }
    case "createCategory": return { ...command, names: [drawCategoryName(faker, listTakenNames(state))] };
    case "createSeeder": return { ...command, names: [drawSeederName(faker, listTakenNames(state))] };
    default: return undefined;
  }
}

/** Runs a command, or returns undefined when the executor refuses it. Low, Sonar 1. */
function tryExecute(state: PanelState, command: StateCommand): PanelState | undefined {
  try {
    return executeCommand(state, expandCommand(command), STAMP);
  } catch {
    return undefined;
  }
}

/**
 * A stop row after a wrong attempt, run on a fresh copy of the start panel. The request is
 * still not met, so the label is `work-needed`. Undefined when no wrong attempt fits. Low, Sonar 1.
 */
export function wrongAttemptRow(faker: Faker, example: Example, start: PanelState): StopRow | undefined {
  const [command] = example.commands;
  if (command === undefined) return undefined;
  const wrong = drawWrongCommand(faker, start, command);
  const after = wrong === undefined
    ? undefined
    : tryExecute(start, wrong);
  if (after === undefined) return undefined;

  return {
    input: { query: example.query, context: formatContext(after, CONDITION_FORMATS, example.query, example.names) },
    output: { reason: "work-needed" },
    meta: { goal: example.goal, form: "wrong-attempt" },
  };
}
