import { type BehaviorActionResult, type BehaviorProps, type BehaviorStrategy } from '~/types'
import { applyResult } from '~/helpers/runner/applyResult'
import { executeThen } from '~/helpers/runner/executeThen'
import { handleFailure } from '~/helpers/runner/handleFailure'
import { normalizeActionResult } from '~/helpers/runner/normalizeActionResult'
import { pushTrace } from '~/helpers/runner/pushTrace'
import { withErrorStage } from '~/helpers/errors/withErrorStage'
import { type Normalized, type RunState, type RunnerEnvironment } from '~/helpers/runner/runnerTypes'

export const afterAction = <TContext, TPatch>(
  raw: BehaviorActionResult<TContext, TPatch>,
  id: string,
  strategy: BehaviorStrategy,
  depth: number,
  state: RunState<TContext, TPatch>,
  props: BehaviorProps,
  dataBefore: Record<string, unknown>,
  traceStep: number,
  startedAt: number,
  environment: RunnerEnvironment<TContext, TPatch>
): Normalized<TContext, TPatch> | Promise<Normalized<TContext, TPatch>> => {
  const result = normalizeActionResult(raw)
  if (result.status === 'failed') {
    result.error = withErrorStage(result.error, {
      phase: 'action',
      strategy: id,
      fn: strategy.fn,
      mode: strategy.mode,
      depth,
      step: traceStep,
    })
  }
  applyResult(result, state, environment.mergeData)
  const reason = result.status === 'failed' ? result.error.message : 'reason' in result ? result.reason : undefined
  pushTrace(
    state,
    traceStep,
    depth,
    id,
    strategy,
    result.status === 'success' ? 'success' : result.status,
    props,
    dataBefore,
    startedAt,
    reason
  )
  if (result.status === 'failed') {
    return handleFailure(result.error, strategy, depth, state, environment)
  }
  if (result.status === 'skipped' || result.status === 'stopped') {
    return result
  }
  if (strategy.terminal) {
    return result
  }
  return executeThen(strategy, depth, state, environment)
}
