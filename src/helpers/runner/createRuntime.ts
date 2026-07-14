import { pick, set } from 'objwalk'
import { type BehaviorRuntime } from '~/types'
import { type RunState } from '~/helpers/runner/runnerTypes'
import { resolveValue } from '~/helpers/path/resolveValue'

const runtimePick = (source: unknown, path: string): unknown => {
  if (!path) {
    return source
  }
  if (!source || typeof source !== 'object') {
    return undefined
  }
  return pick(source as Record<string, unknown>, path)
}

export const createRuntime = <TContext, TPatch>(state: RunState<TContext, TPatch>): BehaviorRuntime => ({
  get: (path) => runtimePick(state.context, path),
  getData: (path) => runtimePick(state.data, path),
  setData: (path, value) => {
    set(state.data, path, value)
  },
  resolve: (value) => resolveValue(value, state),
  signal: state.signal,
  emit: (event) => state.events.push(event),
  patch: (patch) => state.patches.push(patch as TPatch),
  stop: (reason) => (reason ? { type: 'stop', reason } : { type: 'stop' }),
  fail: (reason, data) => ({
    type: 'fail',
    ...(reason ? { reason } : {}),
    ...(data ? { data } : {}),
  }),
})
