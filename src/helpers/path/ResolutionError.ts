import { type BehaviorError } from '~/types'

export class ResolutionError extends Error {
  readonly behaviorError: BehaviorError

  constructor(behaviorError: BehaviorError) {
    super(behaviorError.message)
    this.name = 'ResolutionError'
    this.behaviorError = behaviorError
  }
}
