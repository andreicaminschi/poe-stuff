import { RARITIES } from "../utils/rarity-set.ts";

export function RarityValue({
  value,
  disabled,
  onChange,
}: {
  readonly value: readonly string[];
  readonly disabled: boolean;
  readonly onChange: (value: readonly string[]) => void;
}) {
  return (
    <div className="rarities">
      {RARITIES.map((rarity) => (
        <label key={rarity} className="check">
          <input
            type="checkbox"
            checked={value.includes(rarity)}
            disabled={disabled}
            onChange={(event) =>
              onChange(RARITIES.filter((other) => (other === rarity ? event.target.checked : value.includes(other))))
            }
          />
          {rarity}
        </label>
      ))}
    </div>
  );
}
