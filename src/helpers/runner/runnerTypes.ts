import {
  type BehaviorConfig,
  type BehaviorError,
  type BehaviorEvent,
  type BehaviorInput,
  type BehaviorRunnerOptions,
  type BehaviorTraceSink,
} from '~/types'
import { type ActionsRegistry } from '~/registry/actions'
import { type ConditionsRegistry } from '~/registry/conditions'

export type Normalized<TContext, TPatch> =
  | {
      status: 'success'
      context?: TContext
      data?: Record<string, unknown>
      patches: TPatch[]
      events: [] | BehaviorEvent[]
    }
  | { status: 'skipped'; reason?: string; data?: Record<string, unknown>; patches: TPatch[]; events: [] }
  | { status: 'stopped'; reason?: string; patches: TPatch[]; events: [] | BehaviorEvent[] }
  | { status: 'failed'; error: BehaviorError; data?: Record<string, unknown>; patches: TPatch[]; events: [] }

export type RunState<TContext, TPatch> = {
  context: TContext
  input: BehaviorInput
  data: Record<string, unknown>
  patches: TPatch[]
  events: BehaviorEvent[]
  steps: number
  startedAt: number
  sync: boolean
  signal: AbortSignal
  reportedErrors: BehaviorError[]
  traceSink?: BehaviorTraceSink
}

export type RunnerEnvironment<TContext, TPatch> = {
  actionsRegistry: ActionsRegistry<TContext, TPatch>
  conditionsRegistry: ConditionsRegistry<TContext>
  configRef: { current?: BehaviorConfig }
  options: BehaviorRunnerOptions<TContext, TPatch>
  mergeData: (current: Record<string, unknown>, next: Record<string, unknown>) => Record<string, unknown>
}
