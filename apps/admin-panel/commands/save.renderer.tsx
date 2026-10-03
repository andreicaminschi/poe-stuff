import type { SaveCommand } from "./save.ts";

export const SaveView = (_props: { readonly command: SaveCommand }) => <p>Save every unsaved edit to disk.</p>;
