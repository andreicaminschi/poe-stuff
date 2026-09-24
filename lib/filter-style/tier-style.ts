import { mix, nearestNamed, readable } from "./tier-style/colour.ts";
import {
  FONT_SIZES,
  HIDDEN,
  WANT,
  type BucketName,
  type Palette,
  type SizeName,
  type Style,
  type TierName,
  type Verb,
} from "./types.ts";

const WHITE = "#ffffff";
const HIDDEN_OPACITY = 0.4;

/** A hint's label wears its hint's border, whatever the tier says. */
export const HINT_BORDERS: Readonly<Partial<Record<Verb, string>>> = { check: "#3c8cff", gamble: "#ff2d2d" };

const base = (size: SizeName): Pick<Style, "size" | "fontSize" | "opacity"> => ({
  size,
  fontSize: FONT_SIZES[size],
  opacity: 1,
});

function marked(palette: Palette, iconSize: 0 | 1): Pick<Style, "icon" | "beam"> {
  const colour = nearestNamed(palette.primary);
  return { icon: { size: iconSize, colour, shape: palette.icon }, beam: { colour } };
}

const plain: Pick<Style, "icon" | "beam"> = { icon: null, beam: null };

/** `primary(n% secondary)`, text and border black or primary. */
function faded(palette: Palette, size: SizeName, share: number): Style {
  const background = mix(palette.primary, palette.secondary, share);
  const text = readable(background, palette.primary);
  return { ...base(size), background, text, border: text, ...plain };
}

function tier(palette: Palette, name: TierName): Style {
  const { primary, secondary } = palette;

  if (name === "T0") return { ...base("XL"), background: WHITE, text: primary, border: primary, ...marked(palette, 0) };
  if (name === "T1") return { ...base("XL"), background: primary, text: secondary, border: secondary, ...marked(palette, 1) };
  if (name === "T2") return { ...base("L"), background: mix(primary, secondary, 0.2), text: secondary, border: secondary, ...plain };
  if (name === "T3") return faded(palette, "M", 0.4);
  if (name === "T4") return faded(palette, "S", 0.7);

  return faded(palette, "XS", 0.8);
}

function bucket(palette: Palette, name: BucketName): Style {
  if (name === WANT) {
    const beam = { colour: nearestNamed(palette.primary) };
    return { ...base("S"), background: palette.primary, text: palette.secondary, border: palette.secondary, icon: null, beam };
  }
  if (name === HIDDEN) return { ...tier(palette, "T5"), opacity: HIDDEN_OPACITY };

  return tier(palette, name);
}

/** How one bucket is drawn from a category's palette, with the verb's hint border on top. */
export function tierStyle(palette: Palette, name: BucketName, verb: Verb = "take"): Style {
  const style = bucket(palette, name);
  const border = HINT_BORDERS[verb];

  return border === undefined ? style : { ...style, border };
}
