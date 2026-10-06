/** Orders names the same way on every run, numbers by value. */
export const compareText = (left: string, right: string): number =>
  left.localeCompare(right, "en", { numeric: true });
