import { pick, set } from 'objwalk'
import { type BehaviorRuntime, type BehaviorRuntimeBranchResult } from '~/types'
import { type RunState } from '~/helpers/runner/runnerTypes'
import { resolveValue } from '~/helpers/path/resolveValue'
import { stopResult } from '~/helpers/runner/stopResult'
import { protectedPickOptions } from '~/helpers/path/protectedPickOptions'

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
): BehaviorRuntime => {
  const data = {
    get: (path: string) => pick(state.data, path),
    set: (path: string, value: unknown) => {
      set(state.data, path, value)
    },
  }

  return {
    get: (path) => pick(state.context as Record<string, unknown>, path),
    set: (path, value) => {
      set(state.context as Record<string, unknown>, path, value)
    },
    data,
    variables: {
      get: (path: string) => pick(state.variables, path, protectedPickOptions),
    },
    getData: (path) => {
      console.warn('runtime.getData() is deprecated; use runtime.data.get() instead')
      return data.get(path)
    },
    setData: (path, value) => {
      console.warn('runtime.setData() is deprecated; use runtime.data.set() instead')
      data.set(path, value)
    },
    resolve: (value) => resolveValue(value, state),
    signal: state.signal,
    executeThen: branches.executeThen,
    executeCatch: branches.executeCatch,
    emit: (event) => state.events.push(event),
    patch: (patch) => state.patches.push(patch as TPatch),
    stop: (reason) => stopResult(reason),
    fail: (reason, failureData) => ({
      type: 'fail',
      ...(reason ? { reason } : {}),
      ...(failureData ? { data: failureData } : {}),
    }),
  }
}
