let ruler: CanvasRenderingContext2D | null | undefined;

/** How wide a label's name renders in the loot font. */
export function measureText(text: string, px: number): number {
  if (ruler === undefined) ruler = document.createElement("canvas").getContext("2d");
  if (ruler === null) return text.length * px * 0.62;

  ruler.font = `small-caps ${px}px Gelasio, Georgia, serif`;
  return ruler.measureText(text).width;
}
