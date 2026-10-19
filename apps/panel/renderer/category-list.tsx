import { usePanel } from "./store.ts";
import "./views.css";

export function CategoryList() {
  const categories = usePanel((state) => state.view?.state.categories);
  const picked = usePanel((state) => state.pickedCategories);
  const { toggleCategory, openDialog } = usePanel.getState();
  const entries = Object.entries(categories ?? {}).sort(([left], [right]) => left.localeCompare(right));

  return (
    <section className="col">
      <div className="head">
        <span>Categories</span>
        <span className="sp" />
        <button type="button" className="btn tiny" onClick={() => openDialog({ kind: "newCategory" })}>+ New</button>
      </div>
      <div className="body">
        {entries.length === 0
          ? <p className="empty">No categories.</p>
          : null}
        {entries.map(([name, category]) => (
          <div
            key={name}
            className={picked.includes(name)
              ? "row on"
              : "row"}
            onClick={() => toggleCategory(name)}
          >
            <span className="name">{name}</span>
            <span className="row-actions" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="btn tiny ghost" onClick={() => openDialog({ kind: "rename", target: "category", name })}>Rename</button>
              <button type="button" className="btn tiny ghost" onClick={() => openDialog({ kind: "merge", category: name })}>Merge</button>
              <button
                type="button"
                className="btn tiny ghost danger"
                onClick={() => openDialog({ kind: "confirm", message: `Delete category ${name} and its seeders?`, command: { type: "deleteCategory", category: name } })}
              >
                Delete
              </button>
            </span>
            <span className="count">{Object.keys(category.seeders ?? {}).length}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
