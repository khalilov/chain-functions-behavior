import { type BehaviorMode, type BehaviorProps, type BehaviorStrategy } from '~/types'
import { cloneData } from '~/helpers/trace/cloneData'
import { type RunState } from '~/helpers/runner/runnerTypes'

export const pushTrace = <TContext, TPatch>(
  state: RunState<TContext, TPatch>,
  step: number,
  depth: number,
  strategyId: string,
  strategy: BehaviorStrategy,
  status: 'matched' | 'skipped' | 'success' | 'stopped' | 'failed',
  props: BehaviorProps,
  dataBefore: Record<string, unknown>,
  startedAt: number,
  reason?: string
): void => {
  state.traceSink?.push({
    step,
    depth,
    strategy: strategyId,
    fn: strategy.fn,
    mode: strategy.mode as BehaviorMode | undefined,
    status,
    input: state.input,
    props,
    dataBefore,
    dataAfter: cloneData(state.data),
    durationMs: Date.now() - startedAt,
    ...(reason ? { reason } : {}),
  })
}
