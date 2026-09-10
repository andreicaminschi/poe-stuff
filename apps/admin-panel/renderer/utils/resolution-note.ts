export function resolutionNote({
  saved,
  failure,
  resolved,
  stale,
  hasVariants,
}: {
  readonly saved: boolean;
  readonly failure?: string;
  readonly resolved: boolean;
  readonly stale: boolean;
  readonly hasVariants: boolean;
}): string {
  if (!saved) return "Save to resolve a new row.";
  if (failure !== undefined) return `Could not resolve: ${failure}`;
  if (!resolved) return "Resolving…";
  if (stale) return "Showing the saved draft. Save to see this edit.";
  if (hasVariants) return "This row resolves once per variant. See the Variants tab.";

  return "Worked out by the taxonomy against the saved draft.";
}
