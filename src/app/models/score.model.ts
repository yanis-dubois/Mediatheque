export enum ScoreDisplayMode {
  HIDDEN = "HIDDEN",
  PERCENT = "PERCENT",
  STARS = "STARS",
  THREE_STEP = "THREE_STEP",
  FIVE_STEP = "FIVE_STEP"
}

export enum ThreeStep {
  DISLIKE,
  LIKE,
  LOVE
}

export enum FiveStep {
  HATE,
  DISLIKE,
  NEUTRAL,
  LIKE,
  LOVE
}

// [0-100] -> [0-10] (each point is a half star)
export function starsFromPercent(score: number): number {
  return  Math.trunc(score / 10);
}
export function starsToPercent(score: number): number {
  return score * 10;
}

export function threeStepFromPercent(score: number): ThreeStep {
  if (score > 80) return ThreeStep.LOVE;
  if (score > 50) return ThreeStep.LIKE;
  return ThreeStep.DISLIKE;
}
export function threeStepToPercent(score: ThreeStep): number {
  switch (score) {
    case ThreeStep.LOVE: return 100;
    case ThreeStep.LIKE: return 70;
    default: return 10;
  }
}

export function fiveStepFromPercent(score: number): FiveStep {
  if (score > 80) return FiveStep.LOVE;
  if (score > 60) return FiveStep.LIKE;
  if (score > 40) return FiveStep.NEUTRAL;
  if (score > 20) return FiveStep.DISLIKE;
  return FiveStep.HATE;
}
export function fiveStepToPercent(score: FiveStep): number {
  switch (score) {
    case FiveStep.LOVE: return 100;
    case FiveStep.LIKE: return 70;
    case FiveStep.NEUTRAL: return 50;
    case FiveStep.DISLIKE: return 30;
    default: return 10;
  }
}
