import { usePanel } from "./store.ts";

export function EditSeederButton({ seederKey }: { readonly seederKey: string }) {
  return (
    <button
      type="button"
      className="btn tiny edit"
      onClick={(event) => {
        event.stopPropagation();
        usePanel.getState().openEditor(seederKey);
      }}
    >
      Edit seeder
    </button>
  );
}
