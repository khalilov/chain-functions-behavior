import { type BehaviorInput } from '~/types'

export const isBehaviorInput = (value: unknown): value is BehaviorInput =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
