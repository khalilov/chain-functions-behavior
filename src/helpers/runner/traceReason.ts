import { type Normalized } from '~/helpers/runner/runnerTypes'

export const traceReason = <TContext, TPatch>(result: Normalized<TContext, TPatch>): string | undefined => {
  if (result.status === 'failed') {
    return result.error.message
  }
  if (result.status === 'success') {
    return undefined
  }
  return result.reason
}
