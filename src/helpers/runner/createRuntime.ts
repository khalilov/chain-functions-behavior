import { pick, set } from 'objwalk'
import { type BehaviorRuntime, type BehaviorRuntimeBranchResult } from '~/types'
import { type RunState } from '~/helpers/runner/runnerTypes'
import { resolveValue } from '~/helpers/path/resolveValue'
import { stopResult } from '~/helpers/runner/stopResult'

const runtimePick = (source: unknown, path: string): unknown => {
  if (!path) {
    return source
  }
  if (!source || typeof source !== 'object') {
    return undefined
  }
  return pick(source as Record<string, unknown>, path)
}

type RuntimeBranches = {
  executeThen(): Promise<BehaviorRuntimeBranchResult>
  executeCatch(): Promise<BehaviorRuntimeBranchResult | undefined>
}

export const createRuntime = <TContext, TPatch>(
  state: RunState<TContext, TPatch>,
  branches: RuntimeBranches = {
    executeThen: async () => ({ status: 'success' }),
    executeCatch: async () => undefined,
  }
): BehaviorRuntime => ({
  get: (path) => runtimePick(state.context, path),
  set: (path, value) => {
    set(state.context as Record<string, unknown>, path, value)
  },
  getData: (path) => runtimePick(state.data, path),
  setData: (path, value) => {
    set(state.data, path, value)
  },
  resolve: (value) => resolveValue(value, state),
  signal: state.signal,
  executeThen: branches.executeThen,
  executeCatch: branches.executeCatch,
  emit: (event) => state.events.push(event),
  patch: (patch) => state.patches.push(patch as TPatch),
  stop: (reason) => stopResult(reason),
  fail: (reason, data) => ({
    type: 'fail',
    ...(reason ? { reason } : {}),
    ...(data ? { data } : {}),
  }),
})
