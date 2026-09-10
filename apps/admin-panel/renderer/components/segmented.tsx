export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
}: {
  readonly value: T;
  readonly options: readonly (readonly [T, string])[];
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map(([option, label]) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          className={option === value ? "on" : ""}
          disabled={disabled}
          onClick={() => onChange(option)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
