import { type BehaviorActionResult } from '~/types'
import { behaviorError } from '~/helpers/errors/behaviorError'
import { type Normalized } from '~/helpers/runner/runnerTypes'
import { skippedResult } from '~/helpers/runner/skippedResult'
import { successResult } from '~/helpers/runner/successResult'

export const normalizeActionResult = <TContext, TPatch>(
  raw: BehaviorActionResult<TContext, TPatch>
): Normalized<TContext, TPatch> => {
  if (raw === false) {
    return skippedResult()
  }
  if (raw == null) {
    return successResult()
  }
  const patches =
    'patch' in raw && raw.patch !== undefined ? ([] as TPatch[]).concat(raw.patch as TPatch | TPatch[]) : []
  const events = 'events' in raw && raw.events ? raw.events : []
  if (raw.type === 'skip') {
    return skippedResult(raw.reason, raw.data)
  }
  if (raw.type === 'stop') {
    return { status: 'stopped', patches, events, ...(raw.reason ? { reason: raw.reason } : {}) }
  }
  if (raw.type === 'fail') {
    return {
      status: 'failed',
      error: behaviorError('ACTION_THROWN', raw.reason ?? 'Action failed', { cause: raw.error }),
      patches: [],
      events: [],
      ...(raw.data ? { data: raw.data } : {}),
    }
  }
  return {
    status: 'success',
    patches,
    events,
    ...(raw.context !== undefined ? { context: raw.context } : {}),
    ...(raw.data ? { data: raw.data } : {}),
  }
}
