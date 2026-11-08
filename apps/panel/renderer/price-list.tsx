import { PRICE_PROVIDERS, type Price, type PriceProvider } from "@poe/panel-state/types";
import { useState } from "react";

type PriceListProps = { readonly prices: readonly Price[]; readonly onChange: (prices: readonly Price[]) => void };

/** Price entries: pick a provider, type its id, `+` adds, `×` removes. */
export function PriceList({ prices, onChange }: PriceListProps) {
  const [provider, setProvider] = useState<PriceProvider>(PRICE_PROVIDERS[0]);
  const [id, setId] = useState("");
  const typed = id.trim();
  const taken = prices.some((price) => price.provider === provider && price.id === typed);

  const add = (): void => {
    if (typed === "" || taken) return;
    onChange([...prices, { provider, id: typed }]);
    setId("");
  };

  return (
    <div className="prices">
      {prices.map((price) => (
        <span key={`${price.provider}:${price.id}`} className="chip mono">
          {`${price.provider} ${price.id}`}
          <button type="button" className="chip-x" aria-label={`Remove ${price.id}`} onClick={() => onChange(prices.filter((entry) => entry !== price))}>×</button>
        </span>
      ))}
      <span className="price-adder">
        <select className="field" value={provider} onChange={(event) => setProvider(event.target.value as PriceProvider)}>
          {PRICE_PROVIDERS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
        </select>
        <input
          className="field"
          placeholder="id"
          value={id}
          onChange={(event) => setId(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
        />
        <button type="button" className="btn tiny" disabled={typed === "" || taken} onClick={add}>+</button>
      </span>
    </div>
  );
}
