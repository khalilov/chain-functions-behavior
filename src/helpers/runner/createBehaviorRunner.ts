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
import { runnerLimitWarnings } from '~/helpers/validation/runnerLimitWarnings'
import { type Normalized, type RunnerEnvironment, type RunState } from '~/helpers/runner/runnerTypes'
import { validateBehaviorConfig } from '~/helpers/validation/validateBehaviorConfig'
import { cloneRuntimeVariables } from '~/helpers/runner/cloneRuntimeVariables'
import { createRunCancellation } from '~/helpers/runner/createRunCancellation'

export const createBehaviorRunner = <TContext, TPatch = unknown>(
  options: BehaviorRunnerOptions<TContext, TPatch> = {}
): BehaviorRunner<TContext, TPatch> => {
  const actionsRegistry = createActionsRegistry<TContext, TPatch>()
  const conditionsRegistry = createConditionsRegistry<TContext>()
  const configRef: { current?: BehaviorConfig } = {}
  const timeout = options.timeout ?? options.timeoutMs
  const runnerOptions = timeout === undefined ? options : { ...options, timeout }
  const mergeData = options.mergeData ?? ((current, next) => ({ ...current, ...next }))
  const variables = cloneRuntimeVariables(options.variables ?? {})

  if (options.timeoutMs !== undefined) {
    console.warn('timeoutMs is deprecated; use timeout. It will be removed in a future major release.')
  }

  const environment: RunnerEnvironment<TContext, TPatch> = {
    actionsRegistry,
    conditionsRegistry,
    configRef,
    options: runnerOptions,
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

  const validateConfig = (target = configRef.current): BehaviorValidationResult => {
    const result = validateBehaviorConfig(target, actionsRegistry, conditionsRegistry)
    return { ...result, warnings: [...result.warnings, ...runnerLimitWarnings(runnerOptions)] }
  }

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
    const cancellation = createRunCancellation(runOptions.signal)
    const state: RunState<TContext, TPatch> = {
      context,
      input,
      data: {},
      patches: [],
      events: [],
      stepCounter: { current: 0 },
      startedAt: Date.now(),
      sync,
      signal: cancellation.controller.signal,
      abort: () => cancellation.controller.abort(),
      closed: false,
      reportedErrors: [],
      variables,
      expressions: options.expressions ?? {},
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
    const finish = (result: Normalized<TContext, TPatch>): BehaviorRunResult<TContext, TPatch> => {
      state.closed = true
      cancellation.dispose()

      return finishRunResult(result, state, traceSink || undefined)
    }
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
