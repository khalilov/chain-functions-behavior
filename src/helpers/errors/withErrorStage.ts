import { type BehaviorError, type BehaviorErrorStage } from '~/types'
import { compactErrorStage } from '~/helpers/errors/compactErrorStage'

export const withErrorStage = (error: BehaviorError, stage: BehaviorErrorStage): BehaviorError => {
  const nextError: BehaviorError = {
    ...error,
    stage: compactErrorStage({
      ...stage,
      ...error.stage,
    }),
  }
  const { strategy: errorStrategy, fn: errorFn } = error
  const { strategy: stageStrategy, fn: stageFn } = stage
  const strategy = errorStrategy ?? stageStrategy
  const fn = errorFn ?? stageFn

  if (strategy) {
    nextError.strategy = strategy
  }
  if (fn) {
    nextError.fn = fn
  }

  return nextError
}
