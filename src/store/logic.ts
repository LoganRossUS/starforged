// Pure helpers for derived campaign values and roll resolution.
import type { Character, Impacts, ProgressTrack, Rank } from './types';
import { RANK_PROGRESS } from './types';

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

/** Count active impacts (each marked debility lowers max momentum by 1). */
export function countImpacts(impacts: Impacts): number {
  let n = 0;
  const flags: (keyof Impacts)[] = [
    'wounded',
    'shaken',
    'unprepared',
    'permanentlyHarmed',
    'traumatized',
    'doomed',
    'tormented',
    'indebted',
    'battered',
    'cursed',
  ];
  for (const f of flags) if (impacts[f]) n++;
  n += impacts.other.filter((o) => o.active).length;
  return n;
}

/** max momentum = 10 - impacts; reset = +2 (0 impacts), +1 (1 impact), 0 (2+). */
export function deriveMomentum(impacts: Impacts): { max: number; reset: number } {
  const n = countImpacts(impacts);
  const max = Math.max(0, 10 - n);
  const reset = n === 0 ? 2 : n === 1 ? 1 : 0;
  return { max, reset };
}

/** Progress score = number of fully filled boxes (ticks / 4, capped 0..10). */
export function progressScore(track: ProgressTrack): number {
  return Math.min(10, Math.floor(track.ticks / 4));
}

export function ticksForRank(rank: Rank): number {
  return RANK_PROGRESS[rank];
}

export interface ActionResolution {
  score: number;
  outcome: 'strong' | 'weak' | 'miss';
  match: boolean;
  beatBoth: boolean;
}

export function resolveAction(score: number, c1: number, c2: number): ActionResolution {
  const beatC1 = score > c1;
  const beatC2 = score > c2;
  let outcome: ActionResolution['outcome'];
  if (beatC1 && beatC2) outcome = 'strong';
  else if (beatC1 || beatC2) outcome = 'weak';
  else outcome = 'miss';
  return { score, outcome, match: c1 === c2, beatBoth: beatC1 && beatC2 };
}

export function resolveProgress(score: number, c1: number, c2: number): ActionResolution {
  return resolveAction(score, c1, c2);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** XP gained when a legacy box fills: 2 normally, 1 if the track has been cleared. */
export function legacyBoxXp(cleared: boolean): number {
  return cleared ? 1 : 2;
}

export function ensureMomentumSync(character: Character): Character {
  const { max, reset } = deriveMomentum(character.impacts);
  return {
    ...character,
    momentum: {
      ...character.momentum,
      max,
      reset,
      value: clamp(character.momentum.value, -6, max),
    },
  };
}
