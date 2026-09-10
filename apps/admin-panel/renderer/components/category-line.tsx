import type { CategoryNode } from "../types.ts";

export function CategoryLine({
  node,
  sub,
  selected,
  onSelect,
  onEdit,
}: {
  readonly node: CategoryNode;
  readonly sub: boolean;
  readonly selected: boolean;
  readonly onSelect: (path: string) => void;
  readonly onEdit: (path: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`cat${sub ? " sub" : ""}${selected ? " on" : ""}${node.authored ? "" : " bare"}`}
      onClick={() => onSelect(node.path)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelect(node.path);
      }}
    >
      <span className="n" title={node.authored ? node.path : `${node.path} has no category record`}>
        {node.label}
      </span>
      <button
        type="button"
        className="edit"
        title="Edit category"
        onClick={(event) => {
          event.stopPropagation();
          onEdit(node.path);
        }}
      >
        ✎
      </button>
      <span className="c">{node.count}</span>
    </div>
  );
}
