import { useLayoutEffect, useRef, useState } from "react";

export function ChipList({
  values,
  placeholder,
  onChange,
}: {
  readonly values: readonly string[];
  readonly placeholder: string;
  readonly onChange: (values: readonly string[]) => void;
}) {
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = box.current;
    if (element === null) return;

    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [values, expanded]);

  const add = () => {
    const value = text.trim();
    if (value !== "" && !values.includes(value)) onChange([...values, value]);
    setText("");
  };

  return (
    <div className="chipbox">
      {values.length === 0
        ? null
        : (
            <div
              className={expanded
                ? "chips"
                : "chips clamp"}
              ref={box}
            >
              {values.map((value) => (
                <span className="chip" key={value}>
                  {value}
                  <button type="button" aria-label="Remove" onClick={() => onChange(values.filter((at) => at !== value))}>×</button>
                </span>
              ))}
            </div>
          )}
      <div className="chip-foot">
        <input
          value={text}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          onBlur={add}
          onKeyDown={(event) => {
            if (event.key === "Enter") add();
          }}
        />
        {overflows || expanded
          ? (
              <button type="button" className="btn tiny" onClick={() => setExpanded(!expanded)}>
                {expanded
                  ? "Show less"
                  : `Show all ${values.length}`}
              </button>
            )
          : null}
      </div>
    </div>
  );
}
