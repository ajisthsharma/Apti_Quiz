export interface ScoringDetails {
  basePoints: number;
  speedBonus: number;
  totalPoints: number;
  timeRemainingSec: number;
}

export const BASE_POINTS = 500;
export const MAX_SPEED_BONUS = 500;

/**
 * Authoritative scoring calculation:
 * - Base points: 500 for a correct answer.
 * - Speed bonus: Up to 500 points, calculated as:
 *     Math.round(500 * (1 - (elapsedMs / totalTimeMs)))
 *   clamped between 0 and 500.
 * - Total per question: 500 to 1,000 points.
 * - Incorrect / Unanswered: 0 points.
 */
export function calculateRoundScore(
  isCorrect: boolean,
  elapsedMs: number,
  timeLimitSec: number
): ScoringDetails {
  if (!isCorrect) {
    return {
      basePoints: 0,
      speedBonus: 0,
      totalPoints: 0,
      timeRemainingSec: 0,
    };
  }

  const totalTimeMs = timeLimitSec * 1000;
  const clampedElapsedMs = Math.min(Math.max(0, elapsedMs), totalTimeMs);
  const remainingMs = Math.max(0, totalTimeMs - clampedElapsedMs);

  const speedFraction = totalTimeMs > 0 ? remainingMs / totalTimeMs : 0;
  const speedBonus = Math.round(MAX_SPEED_BONUS * speedFraction);
  const totalPoints = BASE_POINTS + speedBonus;

  return {
    basePoints: BASE_POINTS,
    speedBonus,
    totalPoints,
    timeRemainingSec: Number((remainingMs / 1000).toFixed(1)),
  };
}

export const SCORING_RULES = [
  {
    title: 'Base Accuracy',
    value: '500 pts',
    desc: 'Awarded immediately for picking the correct answer.',
  },
  {
    title: 'Speed Bonus',
    value: 'Up to 500 pts',
    desc: 'The faster your answer reaches the server, the more speed bonus you earn (linear decay to 0 at the bell).',
  },
  {
    title: 'Incorrect Answer',
    value: '0 pts',
    desc: 'No negative marking, but zero points are awarded for wrong choices.',
  },
  {
    title: 'Server Authority',
    value: 'Authoritative Clock',
    desc: 'Times are measured strictly on the server against the round start timestamp to ensure fair play.',
  },
];
