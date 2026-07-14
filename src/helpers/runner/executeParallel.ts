import { type BehaviorNext } from '~/types'
import { executeNext } from '~/helpers/runner/executeNext'
import { executeSequence } from '~/helpers/runner/executeSequence'
import { type Normalized, type RunState, type RunnerEnvironment } from '~/helpers/runner/runnerTypes'
import { skippedResult } from '~/helpers/runner/skippedResult'
import { successResult } from '~/helpers/runner/successResult'

export const executeParallel = <TContext, TPatch>(
  items: BehaviorNext[],
  depth: number,
  state: RunState<TContext, TPatch>,
  environment: RunnerEnvironment<TContext, TPatch>
): Normalized<TContext, TPatch> | Promise<Normalized<TContext, TPatch>> => {
  if (state.sync) {
    return executeSequence(items, depth, state, environment)
  }
  const snapshots = items.map((item) => {
    const child: RunState<TContext, TPatch> = { ...state, patches: [], events: [], data: { ...state.data } }
    return Promise.resolve(executeNext(item, depth + 1, child, environment)).then((result) => ({ result, child }))
  })
  return Promise.all(snapshots).then((results) => {
    for (const { result } of results) {
      if (result.status === 'failed' || result.status === 'stopped') {
        return result
      }
    }
    for (const { child } of results) {
      state.patches.push(...child.patches)
      state.events.push(...child.events)
      state.data = environment.mergeData(state.data, child.data)
      state.steps = Math.max(state.steps, child.steps)
    }
    return results.some(({ result }) => result.status === 'success')
      ? successResult<TContext, TPatch>()
      : skippedResult<TContext, TPatch>('All parallel branches skipped')
  })
}
