type Props = {
  readonly name: string;
  readonly range: string;
  readonly size?: string;
  readonly count: number;
  readonly selected: boolean;
  readonly enabled?: boolean;
  readonly onSelect: () => void;
  readonly onToggle?: () => void;
};

/** One line of the ladder. A rung with `onToggle` has a switch. */
export function Rung({ name, range, size, count, selected, enabled = true, onSelect, onToggle }: Props) {
  return (
    <div className={`rung ${selected ? "on" : ""} ${enabled ? "" : "idle"}`} onClick={onSelect}>
      {onToggle === undefined ? null : (
        <input
          type="checkbox"
          checked={enabled}
          title={`${enabled ? "Disable" : "Enable"} ${name}`}
          onClick={(event) => event.stopPropagation()}
          onChange={onToggle}
        />
      )}
      <span className="n">{name}</span>
      <span className="sp">
        <span className="range">{range}</span>
      </span>
      {size === undefined ? null : <span className="sz">{size}</span>}
      <span className="c">{count}</span>
    </div>
  );
}
