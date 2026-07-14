import {
  type BehaviorAction,
  type BehaviorConditionFn,
  type BehaviorConfig,
  type BehaviorInput,
  type BehaviorRunResult,
  type BehaviorRunner,
  type BehaviorRunOptions,
  type BehaviorRunnerOptions,
  type BehaviorValidationResult,
} from '~/types'
import { BehaviorSyncAsyncError } from '~/errors'
import { createActionsRegistry } from '~/registry/actions'
import { createConditionsRegistry } from '~/registry/conditions'
import { createMemoryTraceSink } from '~/helpers/trace/createMemoryTraceSink'
import { executeStrategy } from '~/helpers/runner/executeStrategy'
import { finishRunResult } from '~/helpers/runner/finishRunResult'
import { behaviorError } from '~/helpers/errors/behaviorError'
import { isPromiseLike } from '~/helpers/runner/isPromiseLike'
import { resolveEntrypoint } from '~/helpers/runner/resolveEntrypoint'
import { type Normalized, type RunnerEnvironment, type RunState } from '~/helpers/runner/runnerTypes'
import { validateBehaviorConfig } from '~/helpers/validation/validateBehaviorConfig'

export const createBehaviorRunner = <TContext, TPatch = unknown>(
  options: BehaviorRunnerOptions<TContext, TPatch> = {}
): BehaviorRunner<TContext, TPatch> => {
  const actionsRegistry = createActionsRegistry<TContext, TPatch>()
  const conditionsRegistry = createConditionsRegistry<TContext>()
  const configRef: { current?: BehaviorConfig } = {}
  const mergeData = options.mergeData ?? ((current, next) => ({ ...current, ...next }))
  const environment: RunnerEnvironment<TContext, TPatch> = {
    actionsRegistry,
    conditionsRegistry,
    configRef,
    options,
    mergeData,
  }

  const registerAction = (name: string, action: BehaviorAction<TContext, TPatch>): void => {
    actionsRegistry.set(name, action)
  }

  const registerActions = (items: Record<string, BehaviorAction<TContext, TPatch>>): void => {
    Object.entries(items).forEach(([name, action]) => registerAction(name, action))
  }

  const registerCondition = (name: string, condition: BehaviorConditionFn<TContext>): void => {
    conditionsRegistry.set(name, condition)
  }

  const registerConditions = (items: Record<string, BehaviorConditionFn<TContext>>): void => {
    Object.entries(items).forEach(([name, condition]) => registerCondition(name, condition))
  }

  const validateConfig = (target = configRef.current): BehaviorValidationResult =>
    validateBehaviorConfig(target, actionsRegistry, conditionsRegistry)

  const loadConfig = (nextConfig: BehaviorConfig): BehaviorValidationResult => {
    configRef.current = nextConfig
    return validateConfig(nextConfig)
  }

  const runInternal = (
    entrypoint: string,
    context: TContext,
    input: BehaviorInput,
    sync: boolean,
    runOptions: BehaviorRunOptions
  ): BehaviorRunResult<TContext, TPatch> | Promise<BehaviorRunResult<TContext, TPatch>> => {
    const traceSink = options.trace === true ? createMemoryTraceSink() : options.trace || undefined
    const state: RunState<TContext, TPatch> = {
      context,
      input,
      data: {},
      patches: [],
      events: [],
      steps: 0,
      startedAt: Date.now(),
      sync,
      signal: runOptions.signal ?? new AbortController().signal,
      reportedErrors: [],
      ...(traceSink ? { traceSink } : {}),
    }
    const reportError = (result: Normalized<TContext, TPatch>): void => {
      if (result.status !== 'failed' || state.reportedErrors.includes(result.error)) {
        return
      }
      state.reportedErrors.push(result.error)
      options.onError?.({
        error: result.error,
        context: state.context,
        input: state.input,
        data: state.data,
        patches: state.patches,
        events: state.events,
        ...(traceSink?.entries ? { trace: traceSink.entries() } : {}),
      })
    }
    const finish = (result: Normalized<TContext, TPatch>): BehaviorRunResult<TContext, TPatch> =>
      finishRunResult(result, state, traceSink || undefined)
    const start = resolveEntrypoint(entrypoint, environment)
    if ('error' in start) {
      const result: Normalized<TContext, TPatch> = { status: 'failed', error: start.error, patches: [], events: [] }
      reportError(result)
      return finish(result)
    }

    const executed = executeStrategy(start.id, {}, 0, state, environment)
    const done = (result: Normalized<TContext, TPatch>) => {
      reportError(result)
      return finish(result)
    }
    return isPromiseLike(executed) ? executed.then(done) : done(executed)
  }

  const run = async (
    entrypoint: string,
    context: TContext,
    input: BehaviorInput = {},
    runOptions: BehaviorRunOptions = {}
  ): Promise<BehaviorRunResult<TContext, TPatch>> =>
    runInternal(entrypoint, context, input, false, runOptions) as Promise<BehaviorRunResult<TContext, TPatch>>

  const runSync = (
    entrypoint: string,
    context: TContext,
    input: BehaviorInput = {},
    runOptions: BehaviorRunOptions = {}
  ): BehaviorRunResult<TContext, TPatch> => {
    const result = runInternal(entrypoint, context, input, true, runOptions)
    if (isPromiseLike(result)) {
      throw new BehaviorSyncAsyncError(behaviorError('ASYNC_IN_SYNC_RUN', 'runSync encountered an async action'))
    }
    return result
  }

  return {
    registerAction,
    registerActions,
    registerCondition,
    registerConditions,
    loadConfig,
    validateConfig,
    run,
    runSync,
  }
}
