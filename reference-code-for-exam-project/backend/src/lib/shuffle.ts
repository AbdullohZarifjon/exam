/**
 * Fisher-Yates shuffle. Returns a NEW array (does not mutate input).
 *
 * @example shuffle([1,2,3]) // -> e.g. [3,1,2]
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Picks N random elements from an array without replacement. */
export function sample<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
