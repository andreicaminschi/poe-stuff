import type { CategoryNode } from "../types.ts";

function caretOf(toggles: boolean, collapsed: boolean): string {
  if (!toggles) return "";

  return collapsed ? "▸" : "▾";
}

export function CategoryLine({
  node,
  sub,
  selected,
  onSelect,
  onEdit,
  collapsed,
  onToggle,
}: {
  readonly node: CategoryNode;
  readonly sub: boolean;
  readonly selected: boolean;
  readonly onSelect: (path: string) => void;
  readonly onEdit: (path: string) => void;
  readonly collapsed?: boolean;
  readonly onToggle?: () => void;
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
      {sub ? null : (
        <button
          type="button"
          className="caret"
          aria-label={collapsed ? "Expand" : "Collapse"}
          aria-expanded={onToggle === undefined ? undefined : !collapsed}
          disabled={onToggle === undefined}
          onClick={(event) => {
            event.stopPropagation();
            onToggle?.();
          }}
        >
          {caretOf(onToggle !== undefined, collapsed === true)}
        </button>
      )}
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
