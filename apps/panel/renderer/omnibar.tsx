import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import "./agent.css";
import { listKnownNames } from "./list-known-names.ts";
import { usePanel } from "./store.ts";
import { suggestNames } from "./suggest-names.ts";
import type { NameSuggestion } from "./suggest-names.ts";

const completeWith = (text: string, suggestion: NameSuggestion): string =>
  `${text.slice(0, text.length - suggestion.replaces.length)}${suggestion.name} `;

function ModelPicker() {
  const models = usePanel((state) => state.models);
  const run = usePanel((state) => state.run);
  const setRun = usePanel((state) => state.setRun);
  if (models.length === 0) return <span className="pill warn">no models</span>;
  return (
    <select className="omnibar-select" value={run} onChange={(event) => setRun(event.target.value)}>
      {models.map((model) => (
        <option key={model.run} value={model.run}>{`${model.run} · ${model.exportedAt.slice(0, 10)}`}</option>
      ))}
    </select>
  );
}

export function Omnibar() {
  const state = usePanel((store) => store.view?.state);
  const planning = usePanel((store) => store.planning);
  const ask = usePanel((store) => store.ask);
  const [text, setText] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const knownNames = useMemo(() => listKnownNames(state), [state]);
  const suggestions = useMemo(() => suggestNames(knownNames, text), [knownNames, text]);

  const complete = (suggestion: NameSuggestion): void => {
    setText(completeWith(text, suggestion));
    setHighlighted(0);
  };

  const submit = async (): Promise<void> => {
    const request = text.trim();
    if (request === "") return;
    await ask(request);
    if (usePanel.getState().plan !== undefined) setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    const picked = suggestions[highlighted] ?? suggestions[0];
    if (event.key === "Tab" && picked !== undefined) {
      event.preventDefault();
      complete(picked);
      return;
    }
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setHighlighted((highlighted + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setHighlighted((highlighted - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="omnibar">
      <input
        className="omnibar-input"
        value={planning
          ? "Planning…"
          : text}
        disabled={planning}
        placeholder="Tell the agent what to change"
        spellCheck={false}
        onChange={(event) => {
          setText(event.target.value);
          setHighlighted(0);
        }}
        onKeyDown={onKeyDown}
      />
      {planning || suggestions.length === 0
        ? null
        : (
            <ul className="suggestions">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.name}
                  className={index === highlighted
                    ? "on"
                    : ""}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    complete(suggestion);
                  }}
                >
                  {suggestion.name}
                </li>
              ))}
            </ul>
          )}
      <ModelPicker />
    </div>
  );
}
