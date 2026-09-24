import { rgbOf } from "../tier-style/colour.ts";
import type { Style } from "../types.ts";

const colour = (hex: string, opacity: number): string => [...rgbOf(hex), Math.round(255 * opacity)].join(" ");

/** A style as the `.filter` action lines that draw it. */
export function actionLines(style: Style): readonly string[] {
  return [
    `SetFontSize ${style.fontSize}`,
    `SetTextColor ${colour(style.text, style.opacity)}`,
    `SetBorderColor ${colour(style.border, style.opacity)}`,
    `SetBackgroundColor ${colour(style.background, style.opacity)}`,
    ...(style.icon === null ? [] : [`MinimapIcon ${style.icon.size} ${style.icon.colour} ${style.icon.shape}`]),
    ...(style.beam === null ? [] : [`PlayEffect ${style.beam.colour}`]),
  ];
}
