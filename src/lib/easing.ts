import type { EasingName } from '~/types/formations';

export type EasingFn = (t: number) => number;

export const EASING_FN: Readonly<Record<EasingName, EasingFn>> = Object.freeze({
  Linear: (t) => t,
  'Ease-in': (t) => t * t,
  'Ease-out': (t) => 1 - (1 - t) * (1 - t),
  'Ease-both': (t) => t * t * (3 - 2 * t),
  Elastic: (t) => {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
});

export function ease(name: EasingName, t: number): number {
  return EASING_FN[name](t);
}
