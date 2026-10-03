import { useMemo, useState, type KeyboardEvent } from "react";
import { listKnownNames } from "../find-names.ts";
import { CONDITION_FORMATS } from "../generate-training/conditions.ts";
import { usePanel } from "./store.ts";
import { suggestNames, type NameSuggestion } from "./suggest-names.ts";

/** The agent's input: an instruction, with known names completed as they are typed. */
export function Omnibar() {
  const loaded = usePanel((state) => state.loaded);
  const planning = usePanel((state) => state.planning);
  const { askAgent, guard } = usePanel.getState();
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);

  const knownNames = useMemo(
    () => (loaded === undefined
      ? []
      : [...listKnownNames(loaded), ...CONDITION_FORMATS.map((condition) => condition.key)]),
    [loaded],
  );
  const suggestions = useMemo(() => suggestNames(knownNames, text), [knownNames, text]);
  const shown = Math.min(highlight, Math.max(suggestions.length - 1, 0));

  const complete = (suggestion: NameSuggestion) => {
    setText(`${text.slice(0, text.length - suggestion.replaces.length)}${suggestion.name} `);
    setHighlight(0);
  };

  const submit = () => {
    const instruction = text.trim();
    if (instruction === "" || planning) return;
    guard(() => {
      void askAgent(instruction);
      setText("");
    });
  };

  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const listed = open && suggestions[shown] !== undefined;
    const completes = event.key === "Enter" || event.key === "Tab" || event.key === "ArrowRight";

    if (listed && completes) {
      event.preventDefault();
      complete(suggestions[shown]!);
      return;
    }
    if (event.key === "ArrowDown" && listed) setHighlight((shown + 1) % suggestions.length);
    if (event.key === "ArrowUp" && listed) setHighlight((shown - 1 + suggestions.length) % suggestions.length);
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && listed) event.preventDefault();
    if (event.key === "Escape") setOpen(false);
    if (event.key === "Enter") submit();
  };

  return (
    <div className="omni-wrap">
      <div className="omni">
        <input
          value={text}
          disabled={planning}
          placeholder={planning
            ? "Planning…"
            : "Tell the agent what to change. Enter, Tab or → picks a name; Enter with no list plans."}
          onChange={(event) => {
            setText(event.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKey}
        />
      </div>
      {open && suggestions.length > 0
        ? (
            <div className="omni-list">
              <div className="grp">Names</div>
              {suggestions.map((suggestion, at) => (
                <div
                  key={suggestion.name}
                  className={at === shown
                    ? "opt hi"
                    : "opt"}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    complete(suggestion);
                  }}
                >
                  <span>{suggestion.name}</span>
                </div>
              ))}
            </div>
          )
        : null}
    </div>
  );
}
