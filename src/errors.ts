import { type BehaviorError } from '~/types'

export { behaviorError } from '~/helpers/errors/behaviorError'
export { defineErrorReporter } from '~/helpers/errors/defineErrorReporter'

export class BehaviorSyncAsyncError extends Error {
  readonly behaviorError: BehaviorError

  constructor(error: BehaviorError) {
    super(error.message)
    this.name = 'BehaviorSyncAsyncError'
    this.behaviorError = error
  }
}
