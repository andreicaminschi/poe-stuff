import { useState } from "react";
import type { CategoryNode } from "../types.ts";
import { CategoryLine } from "./category-line.tsx";

export function CategoryBranch({
  node,
  selection,
  onSelect,
  onEdit,
}: {
  readonly node: CategoryNode;
  readonly selection?: string;
  readonly onSelect: (path: string) => void;
  readonly onEdit: (path: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <CategoryLine
        node={node}
        sub={false}
        selected={node.path === selection}
        onSelect={onSelect}
        onEdit={onEdit}
        {...(node.children.length === 0 ? {} : { collapsed, onToggle: () => setCollapsed(!collapsed) })}
      />
      {(collapsed ? [] : node.children).map((child) => (
        <CategoryLine
          key={child.path}
          node={child}
          sub
          selected={child.path === selection}
          onSelect={onSelect}
          onEdit={onEdit}
        />
      ))}
    </>
  );
}
