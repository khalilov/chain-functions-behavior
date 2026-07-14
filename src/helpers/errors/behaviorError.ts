import { type BehaviorError } from '~/types'

export const behaviorError = (
  code: string,
  message: string,
  extras: Omit<BehaviorError, 'code' | 'message'> = {}
): BehaviorError => ({ code, message, ...extras })
