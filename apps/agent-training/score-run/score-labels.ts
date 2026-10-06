/** One classifier prediction next to its gold label. */
export type LabelledPrediction = { readonly label: string; readonly predicted: string; readonly mutation?: string; readonly kind: string };

export type LabelScore = { readonly count: number; readonly recall: number; readonly precision: number };

export type LabelReport = {
  readonly count: number;
  readonly accuracy: number;
  readonly macroF1: number;
  readonly perLabel: Readonly<Record<string, LabelScore>>;
  readonly perMutation: Readonly<Record<string, { readonly count: number; readonly caught: number }>>;
  readonly worstKinds: readonly { readonly kind: string; readonly count: number; readonly accuracy: number }[];
};

/** Divides, answering 0 for an empty denominator. */
const share = (part: number, whole: number): number => (whole === 0
  ? 0
  : part / whole);

/** Scores one label: how many gold rows it has, and its recall and precision. */
function scoreLabel(rows: readonly LabelledPrediction[], label: string): LabelScore {
  const gold = rows.filter((row) => row.label === label);
  const predicted = rows.filter((row) => row.predicted === label);
  const hits = gold.filter((row) => row.predicted === label).length;

  return { count: gold.length, recall: share(hits, gold.length), precision: share(hits, predicted.length) };
}

/**
 * Scores a classifier's predictions: accuracy, macro-F1 (F1 averaged over labels, so rare labels
 * count as much as common ones), recall and precision per label, how many rejects each mutation
 * kind got caught, and the goal kinds it gets wrong most.
 */
export function scoreLabels(rows: readonly LabelledPrediction[]): LabelReport {
  const labels = [...new Set(rows.map((row) => row.label))].sort();
  const perLabel = Object.fromEntries(labels.map((label) => [label, scoreLabel(rows, label)]));
  const f1s = labels.map((label) => {
    const { recall, precision } = perLabel[label]!;
    return recall + precision === 0
      ? 0
      : (2 * recall * precision) / (recall + precision);
  });
  const mutations = [...new Set(rows.flatMap((row) => (row.mutation === undefined
    ? []
    : [row.mutation])))].sort();
  const perMutation = Object.fromEntries(mutations.map((mutation) => {
    const own = rows.filter((row) => row.mutation === mutation);
    return [mutation, { count: own.length, caught: own.filter((row) => row.predicted === row.label).length }];
  }));
  const kinds = [...new Set(rows.map((row) => row.kind))].map((kind) => {
    const own = rows.filter((row) => row.kind === kind);
    return { kind, count: own.length, accuracy: share(own.filter((row) => row.predicted === row.label).length, own.length) };
  });

  return {
    count: rows.length,
    accuracy: share(rows.filter((row) => row.predicted === row.label).length, rows.length),
    macroF1: share(f1s.reduce((sum, f1) => sum + f1, 0), f1s.length),
    perLabel,
    perMutation,
    worstKinds: kinds.filter((kind) => kind.accuracy < 1).sort((left, right) => left.accuracy - right.accuracy).slice(0, 8),
  };
}
