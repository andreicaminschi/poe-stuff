import { EditorFoot } from "../components/editor-foot.tsx";
import { useDirty } from "../hooks/use-dirty.ts";
import { useEditable } from "../hooks/use-editable.ts";
import { useItemResolution } from "../hooks/use-item-resolution.ts";
import { useSelectedItem } from "../hooks/use-selected-item.ts";
import { useSession } from "../session-store.ts";
import { conditionOrigins } from "../utils/condition-origins.ts";
import { displayName } from "../utils/display-name.ts";
import { ItemPane } from "./item-pane.tsx";
import { MultiItemPane } from "./multi-item-pane.tsx";
import { VariantsPane } from "./variants-pane.tsx";

export function ItemEditor() {
  const tab = useSession((state) => state.tab);
  const setTab = useSession((state) => state.setTab);
  const busy = useSession((state) => state.busy);
  const save = useSession((state) => state.save);
  const revert = useSession((state) => state.revert);
  const undo = useSession((state) => state.undo);
  const ledgerSize = useSession((state) => state.ledger.length);
  const bulk = useSession((state) => state.checked.length > 1);
  const item = useSelectedItem();
  const editable = useEditable();
  const dirty = useDirty();
  const resolution = useItemResolution(item);
  const canUndo = editable && dirty === 0 && ledgerSize > 0;

  const variants = item?.variants ?? [];
  const hasVariants = variants.length > 0;
  const own = hasVariants ? undefined : resolution?.[0];

  const foot = (
    <EditorFoot
      dirty={dirty}
      busy={busy}
      editable={editable}
      canUndo={canUndo}
      undo={undo}
      revert={revert}
      save={save}
    />
  );

  if (bulk) {
    return (
      <div className="col detail">
        <div className="panes">
          <MultiItemPane />
        </div>
        {foot}
      </div>
    );
  }

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
            {...(own === undefined
              ? {}
              : {
                  resolved: {
                    label: "Conditions applied to this item",
                    conditions: own.conditions,
                    removed: own.removed,
                    problems: own.problems,
                    origins: conditionOrigins(item.classification, displayName(item)),
                  },
                })}
            {...(hasVariants ? { resolveNote: "This row resolves once per variant. See the Variants tab." } : {})}
            hasVariants={hasVariants}
          />
        ) : null}
        {item !== undefined && tab === "variants" ? (
          <VariantsPane key={item.key} item={item} {...(resolution === undefined ? {} : { resolutions: resolution })} />
        ) : null}
      </div>

      {foot}
    </div>
  );
}
