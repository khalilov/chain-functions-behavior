import { type BehaviorActionResult, type BehaviorProps } from '~/types'
import { BehaviorSyncAsyncError } from '~/errors'
import { afterAction } from '~/helpers/runner/afterAction'
import { behaviorError } from '~/helpers/errors/behaviorError'
import { cloneData } from '~/helpers/trace/cloneData'
import { createRuntime } from '~/helpers/runner/createRuntime'
import { defaultMaxDepth, defaultMaxSteps } from '~/helpers/runner/runnerDefaults'
import { evaluateCondition } from '~/helpers/runner/evaluateCondition'
import { failLimit } from '~/helpers/runner/failLimit'
import { handleFailure } from '~/helpers/runner/handleFailure'
import { isPromiseLike } from '~/helpers/runner/isPromiseLike'
import { pushTrace } from '~/helpers/runner/pushTrace'
import { resolveValue } from '~/helpers/path/resolveValue'
import { withErrorStage } from '~/helpers/errors/withErrorStage'
import { type Normalized, type RunState, type RunnerEnvironment } from '~/helpers/runner/runnerTypes'

export const executeStrategy = <TContext, TPatch>(
  id: string,
  extraProps: BehaviorProps,
  depth: number,
  state: RunState<TContext, TPatch>,
  environment: RunnerEnvironment<TContext, TPatch>
): Normalized<TContext, TPatch> | Promise<Normalized<TContext, TPatch>> => {
  const config = environment.configRef.current
  if (!config) {
    return {
      status: 'failed',
      error: behaviorError('CONFIG_INVALID', 'No behavior config loaded', { stage: { phase: 'entrypoint' } }),
      patches: [],
      events: [],
    }
  }
  if (depth > (environment.options.maxDepth ?? defaultMaxDepth)) {
    return failLimit('MAX_DEPTH', `Max depth exceeded at strategy "${id}"`, id)
  }
  if (state.steps >= (environment.options.maxSteps ?? defaultMaxSteps)) {
    return failLimit('MAX_STEPS', `Max steps exceeded at strategy "${id}"`, id)
  }
  if (environment.options.timeoutMs && Date.now() - state.startedAt > environment.options.timeoutMs) {
    return failLimit('TIMEOUT', `Behavior run timed out after ${environment.options.timeoutMs}ms`, id)
  }

  const strategy = config.strategies[id]
  if (!strategy) {
    return {
      status: 'failed',
      error: behaviorError('STRATEGY_NOT_FOUND', `Strategy "${id}" is not defined`, {
        strategy: id,
        stage: { phase: 'entrypoint', strategy: id, depth },
      }),
      patches: [],
      events: [],
    }
  }
  const action = environment.actionsRegistry.get(strategy.fn)
  if (!action) {
    return {
      status: 'failed',
      error: behaviorError('ACTION_NOT_FOUND', `Action "${strategy.fn}" is not registered`, {
        strategy: id,
        fn: strategy.fn,
        stage: { phase: 'action', strategy: id, fn: strategy.fn, mode: strategy.mode, depth, step: state.steps + 1 },
      }),
      patches: [],
      events: [],
    }
  }

  const props = resolveValue({ ...(strategy.props ?? {}), ...extraProps }, state) as BehaviorProps
  const runtime = createRuntime(state)
  const dataBefore = cloneData(state.data)
  const traceStep = state.steps + 1
  const startedAt = Date.now()

  const condition = evaluateCondition(strategy.when, environment.conditionsRegistry, {
    ...state,
    runtime,
    strategy: id,
  })
  if (!condition.ok) {
    return handleFailure(
      withErrorStage(condition.error, {
        phase: 'condition',
        strategy: id,
        fn: strategy.fn,
        mode: strategy.mode,
        depth,
        step: traceStep,
      }),
      strategy,
      depth,
      state,
      environment
    )
  }
  if (!condition.matched) {
    pushTrace(state, traceStep, depth, id, strategy, 'skipped', props, dataBefore, startedAt)
    return { status: 'skipped', reason: 'when condition did not match', patches: [], events: [] }
  }

  state.steps += 1
  const invoke = (): BehaviorActionResult<TContext, TPatch> | Promise<BehaviorActionResult<TContext, TPatch>> =>
    action({ context: state.context, props, input: state.input, signal: state.signal, runtime })

  try {
    const raw = invoke()
    if (isPromiseLike(raw)) {
      if (state.sync) {
        throw new BehaviorSyncAsyncError(
          behaviorError('ASYNC_IN_SYNC_RUN', `Strategy "${id}" returned a Promise`, {
            strategy: id,
            fn: strategy.fn,
            stage: { phase: 'action', strategy: id, fn: strategy.fn, mode: strategy.mode, depth, step: traceStep },
          })
        )
      }
      return raw
        .then((value) =>
          afterAction(value, id, strategy, depth, state, props, dataBefore, traceStep, startedAt, environment)
        )
        .catch((cause) =>
          handleFailure(
            behaviorError('ACTION_THROWN', `Action "${strategy.fn}" threw`, {
              strategy: id,
              fn: strategy.fn,
              cause,
              stage: { phase: 'action', strategy: id, fn: strategy.fn, mode: strategy.mode, depth, step: traceStep },
            }),
            strategy,
            depth,
            state,
            environment
          )
        )
    }
    return afterAction(raw, id, strategy, depth, state, props, dataBefore, traceStep, startedAt, environment)
  } catch (cause) {
    if (cause instanceof BehaviorSyncAsyncError) {
      throw cause
    }
    return handleFailure(
      behaviorError('ACTION_THROWN', `Action "${strategy.fn}" threw`, {
        strategy: id,
        fn: strategy.fn,
        cause,
        stage: { phase: 'action', strategy: id, fn: strategy.fn, mode: strategy.mode, depth, step: traceStep },
      }),
      strategy,
      depth,
      state,
      environment
    )
  }
}
