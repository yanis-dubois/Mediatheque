export enum ScoreDisplayMode {
  HIDDEN = "HIDDEN",
  PERCENT = "PERCENT",
  STARS = "STARS",
  THREE_STEP = "THREE_STEP",
  FIVE_STEP = "FIVE_STEP"
}

export enum ThreeStep {
  LOVE = "LOVE",
  LIKE = "LIKE",
  DISLIKE = "DISLIKE",
  UNDEFINED = "UNDEFINED",
}

export enum FiveStep {
  LOVE = "LOVE",
  LIKE = "LIKE",
  NEUTRAL = "NEUTRAL",
  DISLIKE = "DISLIKE",
  HATE = "HATE",
  UNDEFINED = "UNDEFINED",
}

export function threeStepFromPercent(score: number | undefined): ThreeStep {
  if (!score) return ThreeStep.UNDEFINED;
  if (score >= 80) return ThreeStep.LOVE;
  if (score >= 50) return ThreeStep.LIKE;
  return ThreeStep.DISLIKE;
}
export function threeStepToPercent(score: ThreeStep): number | undefined {
  switch (score) {
    case ThreeStep.LOVE: return 100;
    case ThreeStep.LIKE: return 70;
    case ThreeStep.DISLIKE: return 10;
    default: return undefined;
  }
}

export function fiveStepFromPercent(score: number | undefined): FiveStep {
  if (!score) return FiveStep.UNDEFINED;
  if (score >= 80) return FiveStep.LOVE;
  if (score >= 60) return FiveStep.LIKE;
  if (score >= 40) return FiveStep.NEUTRAL;
  if (score >= 20) return FiveStep.DISLIKE;
  return FiveStep.HATE;
}
export function fiveStepToPercent(score: FiveStep): number | undefined {
  switch (score) {
    case FiveStep.LOVE: return 100;
    case FiveStep.LIKE: return 70;
    case FiveStep.NEUTRAL: return 50;
    case FiveStep.DISLIKE: return 30;
    case FiveStep.HATE: return 1;
    default: return undefined;
  }
}
