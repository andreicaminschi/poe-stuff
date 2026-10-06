const COLLATOR = new Intl.Collator("en", { numeric: true });

/** Orders names the same way on every run, numbers by value. One shared comparer, since building one per call is slow. */
export const compareText = (left: string, right: string): number => COLLATOR.compare(left, right);
