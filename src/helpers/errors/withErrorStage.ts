import { type BehaviorError, type BehaviorErrorStage } from '~/types'

const compactStage = (stage: BehaviorErrorStage): BehaviorErrorStage =>
  Object.fromEntries(Object.entries(stage).filter(([, value]) => value !== undefined)) as BehaviorErrorStage

export const withErrorStage = (error: BehaviorError, stage: BehaviorErrorStage): BehaviorError => {
  const nextError: BehaviorError = {
    ...error,
    stage: compactStage({
      ...stage,
      ...error.stage,
    }),
  }
  const strategy = error.strategy ?? stage.strategy
  const fn = error.fn ?? stage.fn

  if (strategy) {
    nextError.strategy = strategy
  }
  if (fn) {
    nextError.fn = fn
  }

  return nextError
}
