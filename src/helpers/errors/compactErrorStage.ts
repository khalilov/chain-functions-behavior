import { type BehaviorErrorStage } from '~/types'

export const compactErrorStage = (stage: BehaviorErrorStage): BehaviorErrorStage =>
  Object.fromEntries(Object.entries(stage).filter(([, value]) => value !== undefined)) as BehaviorErrorStage
