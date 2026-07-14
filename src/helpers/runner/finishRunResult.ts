import { type BehaviorRunResult, type BehaviorTraceSink } from '~/types'
import { type Normalized, type RunState } from '~/helpers/runner/runnerTypes'

export const finishRunResult = <TContext, TPatch>(
  result: Normalized<TContext, TPatch>,
  state: RunState<TContext, TPatch>,
  traceSink?: BehaviorTraceSink
): BehaviorRunResult<TContext, TPatch> => {
  const runResult: BehaviorRunResult<TContext, TPatch> = {
    status: result.status,
    context: state.context,
    data: state.data,
    patches: state.patches,
    events: state.events,
    steps: state.steps,
  }
  if (result.status === 'failed') {
    runResult.error = result.error
  }
  const entries = traceSink?.entries?.()
  if (entries) {
    runResult.trace = entries
  }
  return runResult
}
