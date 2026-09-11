import type { Category, Item } from "../api/taxonomy/types.ts";

export type Changes = {
  readonly items: Readonly<Record<string, Item>>;
  readonly categories: Readonly<Record<string, Category | null>>;
};

export type CategoryNode = {
  readonly path: string;
  readonly label: string;
  readonly count: number;
  readonly authored: boolean;
  readonly children: readonly CategoryNode[];
};

export type CategoryTree = {
  readonly nodes: readonly CategoryNode[];
};

export type Flag = "filterable" | "tradable" | "tradedOnExchange";

export type Tab = "item" | "variants";

export type View = "included" | "excluded";

export type CategoryTarget =
  | { readonly kind: "edit"; readonly path: string }
  | { readonly kind: "new-category" }
  | { readonly kind: "new-subcategory" };

export type Dialog =
  | { readonly kind: "validation" }
  | { readonly kind: "runs" }
  | { readonly kind: "changes" }
  | { readonly kind: "category"; readonly target: CategoryTarget }
  | { readonly kind: "author"; readonly replaces: string };

export type Kind = "text" | "number" | "flag" | "list" | "from-name" | "from-baseTypes" | "remove";
