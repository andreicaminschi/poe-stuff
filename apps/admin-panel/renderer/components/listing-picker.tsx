import { useState } from "react";
import type { Listing } from "../../api/taxonomy/types.ts";
import type { PriceOption } from "../types.ts";
import { describeListing } from "../utils/describe-listing.ts";
import { listingsOf } from "../utils/listings-of.ts";
import { ComboBox } from "./combo-box.tsx";

/** The listings a row links to: each removable, and a box to link one more. */
export function ListingPicker({
  id,
  listing,
  options,
  disabled,
  placeholder,
  onPick,
}: {
  readonly id?: string;
  readonly listing: Listing | undefined;
  readonly options: readonly PriceOption[];
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly onPick: (listing: Listing | undefined) => void;
}) {
  const [text, setText] = useState("");
  const linked = listingsOf(listing);

  return (
    <div className="linked">
      {linked.map((query, index) => (
        <div className="variant" key={describeListing(query)}>
          <span className="vn">{describeListing(query)}</span>
          {disabled === true ? null : (
            <button
              type="button"
              className="btn icon"
              title="Unlink"
              onClick={() => {
                const rest = linked.filter((_, at) => at !== index);
                onPick(rest.length === 0 ? undefined : rest);
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {disabled === true ? null : (
        <ComboBox
          {...(id === undefined ? {} : { id })}
          placeholder={linked.length === 0 ? (placeholder ?? "") : "Link another listing"}
          value={text}
          options={options}
          onBlur={() => setText("")}
          onChange={(next) => {
            setText(next);
            const picked = options.find((option) => option.value === next);
            if (picked === undefined) return;
            setText("");
            if (linked.some((query) => describeListing(query) === picked.value)) return;
            onPick([...linked, picked.listing]);
          }}
        />
      )}
    </div>
  );
}
