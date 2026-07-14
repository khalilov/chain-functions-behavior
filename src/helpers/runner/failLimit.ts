import { type Normalized } from '~/helpers/runner/runnerTypes'
import { behaviorError } from '~/helpers/errors/behaviorError'

export const failLimit = <TContext, TPatch>(
  code: string,
  message: string,
  id: string
): Normalized<TContext, TPatch> => ({
  status: 'failed',
  error: behaviorError(code, message, { strategy: id, stage: { phase: 'limit', strategy: id } }),
  patches: [],
  events: [],
})
