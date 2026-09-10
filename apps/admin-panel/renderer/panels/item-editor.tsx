import { useEffect, useState } from "react";
import type { Resolution } from "../../api/taxonomy.resolve.api.ts";
import { useDirty } from "../hooks/use-dirty.ts";
import { useEditable } from "../hooks/use-editable.ts";
import { useSavedItem } from "../hooks/use-saved-item.ts";
import { useSelectedItem } from "../hooks/use-selected-item.ts";
import { useSession } from "../session-store.ts";
import { pathOf } from "../utils/path-of.ts";
import { resolutionNote } from "../utils/resolution-note.ts";
import { ItemPane } from "./item-pane.tsx";
import { VariantsPane } from "./variants-pane.tsx";

type Resolved = { readonly rows: readonly Resolution[]; readonly above: Resolution };

export function ItemEditor() {
  const versionId = useSession((state) => state.versionId);
  const tab = useSession((state) => state.tab);
  const setTab = useSession((state) => state.setTab);
  const busy = useSession((state) => state.busy);
  const save = useSession((state) => state.save);
  const revert = useSession((state) => state.revert);
  const stale = useSession(
    (state) => state.selectedKey !== undefined && state.changes.items[state.selectedKey] !== undefined,
  );
  const item = useSelectedItem();
  const savedItem = useSavedItem();
  const editable = useEditable();
  const dirty = useDirty();
  const [resolved, setResolved] = useState<Resolved | undefined>();
  const [failure, setFailure] = useState<string | undefined>();

  useEffect(() => {
    setResolved(undefined);
    setFailure(undefined);
    if (versionId === undefined || savedItem === undefined) return;

    let live = true;
    Promise.all([
      window.panel.resolveItem(versionId, savedItem.key),
      window.panel.resolveCategory(versionId, pathOf(savedItem.classification)),
    ]).then(
      ([rows, above]) => {
        if (live) setResolved({ rows, above });
      },
      (reason: unknown) => {
        if (live) setFailure(String(reason));
      },
    );

    return () => {
      live = false;
    };
  }, [versionId, savedItem]);

  const variants = item?.variants ?? [];
  const hasVariants = variants.length > 0;
  const own = resolved?.rows.length === 1 && resolved.rows[0]?.variant === undefined ? resolved.rows[0] : undefined;

  const resolveNote = resolutionNote({
    saved: savedItem !== undefined,
    failure,
    resolved: resolved !== undefined,
    stale,
    hasVariants,
  });

  return (
    <div className="col detail">
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "item"}
          className={tab === "item" ? "on" : ""}
          onClick={() => setTab("item")}
        >
          Item
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "variants"}
          className={tab === "variants" ? "on" : ""}
          onClick={() => setTab("variants")}
        >
          Variants <span className="mono faint">{variants.length}</span>
        </button>
      </div>

      <div className="panes">
        {item === undefined ? <p className="note pad">Pick an item.</p> : null}
        {item !== undefined && tab === "item" ? (
          <ItemPane
            item={item}
            {...(resolved === undefined
              ? {}
              : {
                  inherited: resolved.above.conditions,
                  ...(own === undefined
                    ? {}
                    : { resolved: { label: "This item matches", conditions: own.conditions, problems: own.problems } }),
                })}
            resolveNote={resolveNote}
            hasVariants={hasVariants}
          />
        ) : null}
        {item !== undefined && tab === "variants" ? (
          <VariantsPane
            key={item.key}
            item={item}
            {...(resolved === undefined ? {} : { resolutions: resolved.rows })}
            stale={stale}
          />
        ) : null}
      </div>

      <div className="foot end">
        <button type="button" className="btn" disabled={dirty === 0 || busy} onClick={revert}>
          Revert
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={dirty === 0 || busy || !editable}
          onClick={() => void save()}
        >
          Save{dirty === 0 ? "" : ` ${dirty}`}
        </button>
      </div>
    </div>
  );
}
