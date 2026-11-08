import { usePanel, type FilterSection } from "./store.ts";

/** The picks of one filter section and the toggle that flips one. */
export function usePicks(section: FilterSection): { readonly picked: readonly string[]; readonly toggle: (name: string) => void } {
  const categories = usePanel((state) => state.pickedCategories);
  const seeders = usePanel((state) => state.pickedSeeders);
  const tags = usePanel((state) => state.pickedTags);
  const { toggleCategory, toggleSeeder, toggleTag } = usePanel.getState();

  if (section === "category") return { picked: categories, toggle: toggleCategory };
  if (section === "seeder") return { picked: seeders, toggle: toggleSeeder };
  return { picked: tags, toggle: toggleTag };
}
