// A small subsequence fuzzy matcher (S11), hand-rolled — no dependency. It scores how well `query`
// matches `target`: characters must appear in order (subsequence), with bonuses for consecutive
// matches, matches at word boundaries, and camelCase transitions, and a mild penalty for length.
// Returns null when the query isn't a subsequence at all. ~80 lines you now own and can tune.

export interface FuzzyMatch {
  score: number;
  indices: number[]; // matched positions in target (for highlighting)
}

function isBoundary(prev: string | undefined): boolean {
  return prev === undefined || prev === " " || prev === "-" || prev === "_" || prev === "/";
}

function isCamel(prev: string | undefined, cur: string): boolean {
  return (
    prev !== undefined &&
    prev === prev.toLowerCase() &&
    cur !== cur.toLowerCase() &&
    cur === cur.toUpperCase()
  );
}

export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  if (query === "") return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const tl = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let lastMatch = -2;
  const indices: number[] = [];

  for (let ti = 0; ti < tl.length && qi < q.length; ti++) {
    if (tl[ti] !== q[qi]) continue;
    let bonus = 1;
    if (lastMatch === ti - 1) bonus += 2; // consecutive run
    if (isBoundary(target[ti - 1])) bonus += 3; // start of a word
    if (isCamel(target[ti - 1], target[ti]!)) bonus += 2; // camelCase hump
    score += bonus;
    indices.push(ti);
    lastMatch = ti;
    qi++;
  }

  if (qi < q.length) return null; // not every query char matched, in order
  score -= (tl.length - indices.length) * 0.1; // prefer tighter matches
  return { score, indices };
}
