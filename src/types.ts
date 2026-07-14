export type BehaviorInput = Record<string, unknown>
export type BehaviorProps = Record<string, unknown>

export type BehaviorConfig = {
  version?: 1
  strategies: Record<string, BehaviorStrategy>
  entrypoints?: Record<string, string>
}

export type BehaviorStrategy = {
  fn: string
  props?: BehaviorProps
  when?: BehaviorConditionExpression
  then?: BehaviorNext[]
  catch?: BehaviorNext[]
  mode?: BehaviorMode
  terminal?: boolean
  tags?: string[]
  description?: string
}

export type BehaviorMode = 'sequence' | 'selector' | 'parallel'

export type BehaviorNext =
  | string
  | {
      id?: string
      strategy: string
      props?: BehaviorProps
      when?: BehaviorConditionExpression
    }

export type BehaviorConditionExpression = boolean | [operator: string, ...args: unknown[]]

export type BehaviorAction<TContext, TPatch = unknown> = (
  args: BehaviorActionArgs<TContext>
) => BehaviorActionResult<TContext, TPatch> | Promise<BehaviorActionResult<TContext, TPatch>>

export type BehaviorActionArgs<TContext> = {
  context: TContext
  props: BehaviorProps
  input: BehaviorInput
  signal: AbortSignal
  runtime: BehaviorRuntime
}

export type BehaviorActionResult<TContext, TPatch = unknown> =
  | void
  | false
  | BehaviorActionSuccess<TContext, TPatch>
  | BehaviorActionSkip
  | BehaviorActionStop<TPatch>
  | BehaviorActionFail

export type BehaviorActionSuccess<TContext, TPatch> = {
  type?: 'success'
  context?: TContext
  data?: Record<string, unknown>
  patch?: TPatch | TPatch[]
  events?: BehaviorEvent[]
  continue?: boolean
}

export type BehaviorActionSkip = {
  type: 'skip'
  reason?: string
  data?: Record<string, unknown>
}

export type BehaviorActionStop<TPatch> = {
  type: 'stop'
  reason?: string
  patch?: TPatch | TPatch[]
  events?: BehaviorEvent[]
}

export type BehaviorActionFail = {
  type: 'fail'
  reason?: string
  error?: unknown
  data?: Record<string, unknown>
}

export type BehaviorEvent = {
  type: string
  payload?: unknown
}

export type BehaviorEventMap = Record<string, unknown>

export type BehaviorEventName<TEvents extends object> = Extract<keyof TEvents, string>

export type BehaviorBusEvent<TPayload = unknown> = {
  id: string
  topic: string
  occurredAt: number
  origin?: string
  parsed: TPayload
  serialized: string
}

export type BehaviorEventHandler<TEvents extends object, TEvent extends BehaviorEventName<TEvents>> = (
  event: BehaviorBusEvent<TEvents[TEvent]>
) => void

export type BehaviorBusErrorEvent<TEvents extends object> =
  | {
      type: 'serialization'
      topic: BehaviorEventName<TEvents>
      payload: TEvents[BehaviorEventName<TEvents>]
      origin?: string
      error: unknown
    }
  | {
      type: 'subscriber'
      event: BehaviorBusEvent<TEvents[BehaviorEventName<TEvents>]>
      error: unknown
    }

export type BehaviorBusEmitOptions = {
  origin?: string
}

export type BehaviorBusOptions<TEvents extends object> = {
  onError?: (event: BehaviorBusErrorEvent<TEvents>) => void
}

export type BehaviorBus<TEvents extends object = BehaviorEventMap> = {
  on<TEvent extends BehaviorEventName<TEvents>>(
    event: TEvent,
    handler: BehaviorEventHandler<TEvents, TEvent>
  ): () => void
  off<TEvent extends BehaviorEventName<TEvents>>(event: TEvent, handler?: BehaviorEventHandler<TEvents, TEvent>): void
  emit<TEvent extends BehaviorEventName<TEvents>>(
    topic: TEvent,
    payload: TEvents[TEvent],
    options?: BehaviorBusEmitOptions
  ): BehaviorBusEvent<TEvents[TEvent]>
  dispatch(event: unknown): BehaviorBusEvent | undefined
}

export type BehaviorWsSocket = {
  readyState: number
  send(data: string): void
  close(): void
  addEventListener(type: 'open' | 'close' | 'error' | 'message', listener: EventListener): void
  removeEventListener(type: 'open' | 'close' | 'error' | 'message', listener: EventListener): void
}

export type BehaviorWsRetryOptions = {
  initialDelay?: number
  maxDelay?: number
  multiplier?: number
  jitter?: boolean
}

export type BehaviorWsOptions<TEvents extends object = BehaviorEventMap> = {
  bus: BehaviorBus<TEvents>
  createSocket: () => BehaviorWsSocket
  inboundTopics?: BehaviorEventName<TEvents>[]
  outboundTopics?: BehaviorEventName<TEvents>[]
  origin?: string
  retry?: BehaviorWsRetryOptions
}

export type BehaviorWsStatus = 'idle' | 'connecting' | 'connected' | 'retrying' | 'stopped'

export type BehaviorWs = {
  start(): void
  stop(): void
  reconnect(): void
  status(): BehaviorWsStatus
}

export type BehaviorBindingEventMap = Record<string, BehaviorInput>

export type BehaviorBusBindingKey<TEvents extends object> = {
  [TEvent in BehaviorEventName<TEvents>]: TEvents[TEvent] extends BehaviorInput ? `[bus] ${TEvent}` : never
}[BehaviorEventName<TEvents>]

export type BehaviorConcurrencyMode = 'parallel' | 'latest' | 'queue' | 'drop'

export type BehaviorQueueOverflow = 'drop-oldest' | 'drop-newest'

export type BehaviorConcurrencyOptions<TPayload = BehaviorInput> = {
  mode?: BehaviorConcurrencyMode
  key?: (payload: TPayload) => string
  maxQueueSize?: number
  overflow?: BehaviorQueueOverflow
}

export type BehaviorBusBinding<TPayload = BehaviorInput> = {
  entrypoint: string
  options?: {
    concurrency?: BehaviorConcurrencyOptions<TPayload>
  }
}

export type BehaviorBusBindings<TEvents extends object> = {
  [TBinding in BehaviorBusBindingKey<TEvents>]?: BehaviorBusBinding<
    TEvents[Extract<TBinding extends `[bus] ${infer TEvent}` ? TEvent : never, BehaviorEventName<TEvents>>]
  >
}

export type BehaviorDomBindingKey = `[dom] ${string}:${string}`

export type BehaviorDomForm = Record<string, FormDataEntryValue | FormDataEntryValue[]>

export type BehaviorDomInput = BehaviorInput & {
  type: string
  value?: string
  dataset: Record<string, string>
  form?: BehaviorDomForm
}

export type BehaviorDomBinding = {
  entrypoint: string
  options?: {
    preventDefault?: boolean
    stopPropagation?: boolean
    capture?: boolean
    once?: boolean
    input?: (scope: { event: Event; element: Element; defaultInput: BehaviorDomInput }) => BehaviorInput
    concurrency?: BehaviorConcurrencyOptions<BehaviorDomInput>
  }
}

export type BehaviorDomBindings = Partial<Record<BehaviorDomBindingKey, BehaviorDomBinding>>

export type ChainBehaviorDefinition<TContext, TPatch = unknown, TEvents extends object = BehaviorBindingEventMap> = {
  config: BehaviorConfig
  actions?: Record<string, BehaviorAction<TContext, TPatch>>
  conditions?: Record<string, BehaviorConditionFn<TContext>>
  events?: BehaviorBusBindings<TEvents> & BehaviorDomBindings
}

export type ChainBehaviorOptions<
  TContext,
  TPatch = unknown,
  TEvents extends object = BehaviorBindingEventMap,
> = BehaviorRunnerOptions<TContext, TPatch> & {
  context: TContext | (() => TContext)
  bus?: BehaviorBus<TEvents>
  root?: Document | Element
  concurrency?: BehaviorConcurrencyOptions
  onRunnerError?: (event: BehaviorRunnerErrorEvent<TContext, TPatch>) => void
}

export type BehaviorRunnerErrorEvent<TContext, TPatch = unknown> = {
  error: BehaviorError
  result: BehaviorRunResult<TContext, TPatch>
  binding: string
  entrypoint: string
  runId: string
  key?: string
}

export type BehaviorInactiveBinding = {
  binding: string
  reason: 'unsupported-source' | 'dom-unavailable'
}

export type BehaviorStartResult = {
  active: string[]
  inactive: BehaviorInactiveBinding[]
  validation: BehaviorValidationResult
}

export type ChainBehavior<TContext, TPatch = unknown> = {
  runner: BehaviorRunner<TContext, TPatch>
  start(): BehaviorStartResult
  stop(options?: { force?: boolean }): void
}

export type BehaviorRunResult<TContext, TPatch = unknown> = {
  status: 'success' | 'stopped' | 'failed' | 'skipped'
  context: TContext
  data: Record<string, unknown>
  patches: TPatch[]
  events: BehaviorEvent[]
  error?: BehaviorError
  trace?: BehaviorTraceEntry[]
  steps: number
}

export type BehaviorRuntime = {
  get(path: string): unknown
  getData(path: string): unknown
  setData(path: string, value: unknown): void
  resolve(value: unknown): unknown
  signal: AbortSignal
  emit(event: BehaviorEvent): void
  patch(patch: unknown): void
  stop(reason?: string): BehaviorActionStop<unknown>
  fail(reason?: string, data?: Record<string, unknown>): BehaviorActionFail
}

export type BehaviorRunnerOptions<TContext, TPatch> = {
  maxSteps?: number
  maxDepth?: number
  timeoutMs?: number
  trace?: boolean | BehaviorTraceSink
  onError?: BehaviorErrorReporter<TContext, TPatch>
  mergeData?: (current: Record<string, unknown>, next: Record<string, unknown>) => Record<string, unknown>
}

export type BehaviorRunOptions = {
  signal?: AbortSignal
}

export type BehaviorTraceSink = {
  push(entry: BehaviorTraceEntry): void
  entries?(): BehaviorTraceEntry[]
}

export type BehaviorTraceEntry = {
  step: number
  depth: number
  strategy: string
  fn: string
  mode: BehaviorMode | undefined
  status: 'matched' | 'skipped' | 'success' | 'stopped' | 'failed'
  input: BehaviorInput
  props: BehaviorProps
  dataBefore: Record<string, unknown>
  dataAfter: Record<string, unknown>
  durationMs: number
  reason?: string
}

export type BehaviorError = {
  code: string
  message: string
  strategy?: string
  fn?: string
  stage?: BehaviorErrorStage
  cause?: unknown
}

export type BehaviorErrorStage = {
  phase: 'entrypoint' | 'condition' | 'action' | 'catch' | 'limit'
  entrypoint?: string | undefined
  strategy?: string | undefined
  fn?: string | undefined
  mode?: BehaviorMode | undefined
  step?: number | undefined
  depth?: number | undefined
}

export type BehaviorErrorEvent<TContext, TPatch = unknown> = {
  error: BehaviorError
  context: TContext
  input: BehaviorInput
  data: Record<string, unknown>
  patches: TPatch[]
  events: BehaviorEvent[]
  trace?: BehaviorTraceEntry[]
}

export type BehaviorErrorReporter<TContext, TPatch = unknown> = (event: BehaviorErrorEvent<TContext, TPatch>) => void

export type BehaviorErrorReporterHandlers<TContext, TPatch = unknown> = {
  report: BehaviorErrorReporter<TContext, TPatch>
}

export type BehaviorValidationResult = {
  ok: boolean
  errors: BehaviorValidationIssue[]
  warnings: BehaviorValidationIssue[]
}

export type BehaviorValidationIssue = {
  code: string
  message: string
  path?: string
  strategy?: string
}

export type BehaviorConditionFn<TContext> = (
  context: {
    context: TContext
    input: BehaviorInput
    data: Record<string, unknown>
    runtime: Pick<BehaviorRuntime, 'resolve' | 'get' | 'getData'>
  },
  ...conditionArgs: unknown[]
) => boolean

export type BehaviorRunner<TContext, TPatch = unknown> = {
  registerAction(name: string, action: BehaviorAction<TContext, TPatch>): void
  registerActions(actions: Record<string, BehaviorAction<TContext, TPatch>>): void
  registerCondition(name: string, condition: BehaviorConditionFn<TContext>): void
  registerConditions(conditions: Record<string, BehaviorConditionFn<TContext>>): void
  loadConfig(config: BehaviorConfig): BehaviorValidationResult
  validateConfig(config?: BehaviorConfig): BehaviorValidationResult
  run(
    entrypoint: string,
    context: TContext,
    input?: BehaviorInput,
    options?: BehaviorRunOptions
  ): Promise<BehaviorRunResult<TContext, TPatch>>
  runSync(
    entrypoint: string,
    context: TContext,
    input?: BehaviorInput,
    options?: BehaviorRunOptions
  ): BehaviorRunResult<TContext, TPatch>
}
