import { ICON_COLOURS, type IconColour } from "../types.ts";

export const rgbOf = (hex: string): readonly number[] => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));

const hexOf = (rgb: readonly number[]): string =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

/** `share` of `secondary`, the rest `primary`. */
export function mix(primary: string, secondary: string, share: number): string {
  const to = rgbOf(secondary);
  return hexOf(rgbOf(primary).map((value, at) => value * (1 - share) + (to[at] ?? 0) * share));
}

const channel = (value: number): number => {
  const unit = value / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
  const [r = 0, g = 0, b = 0] = rgbOf(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio, 1 to 21. */
export function contrast(one: string, other: string): number {
  const [light = 0, dark = 0] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/** Black or primary, whichever reads better on the background. */
export const readable = (background: string, primary: string): string =>
  contrast(background, "#000000") >= contrast(background, primary) ? "#000000" : primary;

/** The game draws icons and beams in eleven named colours only. */
export function nearestNamed(hex: string): IconColour {
  const [r = 0, g = 0, b = 0] = rgbOf(hex);
  const distance = (name: IconColour) => {
    const [R = 0, G = 0, B = 0] = rgbOf(ICON_COLOURS[name]);
    return (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2;
  };
  const names = Object.keys(ICON_COLOURS) as IconColour[];

  return names.reduce((best, name) => (distance(name) < distance(best) ? name : best));
}
