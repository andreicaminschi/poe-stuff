export type Tree = Readonly<Record<string, unknown>>;

export type Path = readonly string[];

/** How one path level is named in a summary line. */
export type Level = {
  readonly one: string;
  readonly many: string;
  readonly unique?: boolean;
};

/** The project's only input: a label per path level, and optional names for value sets. */
export type SummaryConfig = {
  readonly levels: Readonly<Record<string, Level>>;
  readonly valueNames?: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
};

export type Snapshots = {
  readonly start: Tree;
  readonly before: Tree;
  readonly after: Tree;
};

export type Change = {
  readonly type: "CREATE" | "REMOVE" | "CHANGE";
  readonly path: Path;
  readonly value?: unknown;
  readonly oldValue?: unknown;
};

export type EntityFact = {
  readonly kind: "added" | "removed";
  readonly pattern: string;
  readonly entity: Path;
  readonly value: unknown;
  readonly path: Path;
  readonly earlier?: string;
};

export type MoveFact = {
  readonly kind: "moved";
  readonly pattern: string;
  readonly from: Path;
  readonly to: Path;
  readonly path: Path;
  readonly earlier?: string;
};

export type RenameFact = {
  readonly kind: "renamed";
  readonly pattern: string;
  readonly from: Path;
  readonly to: Path;
  readonly path: Path;
  readonly earlier?: string;
};

export type FieldFact = {
  readonly kind: "field";
  readonly pattern: string | undefined;
  readonly owner: Path;
  readonly text: string;
  readonly addVerb: "added" | "set";
  readonly path: Path;
  readonly earlier?: string;
};

export type Fact = EntityFact | RenameFact | MoveFact | FieldFact;

export type Group = {
  readonly kind: Fact["kind"];
  readonly pattern: string | undefined;
  readonly collection: Path;
  readonly toCollection?: Path;
  readonly toName?: string;
  readonly names: readonly string[];
  readonly siblings: readonly string[];
  readonly text?: string;
  readonly earlier?: string;
};
