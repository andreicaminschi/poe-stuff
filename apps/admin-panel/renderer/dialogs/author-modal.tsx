import { useState } from "react";
import { Modal } from "../components/modal.tsx";
import { useDraft } from "../hooks/use-draft.ts";
import { useTopCategories } from "../hooks/use-top-categories.ts";
import { useSession } from "../session-store.ts";
import { authoredRowProblem } from "../utils/authored-row-problem.ts";
import { slug } from "../utils/slug.ts";

export function AuthorModal({ replaces }: { readonly replaces: string }) {
  const draft = useDraft();
  const tops = useTopCategories();
  const authorRow = useSession((state) => state.authorRow);
  const closeDialog = useSession((state) => state.closeDialog);

  const source = draft?.items[replaces];
  const [name, setName] = useState(source?.name ?? "");
  const [category, setCategory] = useState(source?.classification.category ?? tops[0]?.path ?? "");
  const [reason, setReason] = useState("");

  const key = `authored/${slug(name)}`;
  const problem = authoredRowProblem({ name, key, taken: draft?.items[key] !== undefined, reason });

  return (
    <Modal
      title="Author a replacement row"
      onClose={closeDialog}
      footer={
        <>
          <button type="button" className="btn" onClick={closeDialog}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={problem !== undefined}
            onClick={() => {
              authorRow({
                source: "authored",
                key,
                name: name.trim(),
                classification: {
                  category,
                  subcategory:
                    category === source?.classification.category ? source.classification.subcategory : null,
                },
                reason: reason.trim(),
                replaces: [replaces],
                conditions: [],
                variants: [],
              });
            }}
          >
            Add row
          </button>
        </>
      }
    >
      <div className="grp">
        <div className="fld">
          <label htmlFor="author-name">Name</label>
          <input id="author-name" type="text" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <p className="note mono">{key}</p>
        <div className="fld">
          <label htmlFor="author-category">Category</label>
          <select id="author-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            {tops.map((node) => (
              <option key={node.path} value={node.path}>
                {node.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fld top">
          <label htmlFor="author-reason">Reason</label>
          <textarea id="author-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <div className="fld">
          <label>Replaces</label>
          <span className="mono faint">{replaces}</span>
        </div>
        {problem === undefined ? null : <p className="err">{problem}</p>}
      </div>
    </Modal>
  );
}
