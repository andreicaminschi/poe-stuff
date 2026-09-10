export type RowProblem = {
  readonly key: string;
  readonly problem: string;
};

export class TableShapeError extends Error {
  constructor(source: string) {
    super(`${source} is not an object`);
    this.name = "TableShapeError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function collect(
  value: unknown,
  source: string,
  problemOf: (key: string, row: unknown) => string | null,
): readonly RowProblem[] {
  if (!isObject(value)) {
    throw new TableShapeError(source);
  }

  return Object.entries(value).flatMap(([key, row]) => {
    const problem = problemOf(key, row);

    return problem === null ? [] : [{ key, problem }];
  });
}

export function throwFirst(source: string, problems: readonly RowProblem[]): void {
  const first = problems[0];

  if (first !== undefined) {
    throw new Error(`${source}: "${first.key}" ${first.problem}`);
  }
}
