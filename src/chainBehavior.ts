import {
  type BehaviorBindingEventMap,
  type BehaviorBus,
  type BehaviorBusBinding,
  type BehaviorBusBindingKey,
  type BehaviorConcurrencyOptions,
  type BehaviorDomBinding,
  type BehaviorDomBindingKey,
  type BehaviorDomForm,
  type BehaviorDomInput,
  type BehaviorEventName,
  type BehaviorEventMap,
  type BehaviorInput,
  type BehaviorStartResult,
  type ChainBehavior,
  type ChainBehaviorDefinition,
  type ChainBehaviorOptions,
} from '~/types'
import { createBehaviorRunner } from '~/runner'
import { PubSubBehavior } from '~/pubSub'

const busBindingPrefix = '[bus] '
const domBindingPrefix = '[dom] '
const defaultMaxQueueSize = 50

type ActiveRun = {
  controller: AbortController
  id: string
}

type RunLane = {
  active?: ActiveRun | undefined
  queue: BehaviorInput[]
}

type SchedulableBinding = {
  entrypoint: string
  options?: { concurrency?: BehaviorConcurrencyOptions<any> }
}

export const createChainBehavior = <TContext, TPatch = unknown, TEvents extends object = BehaviorBindingEventMap>(
  definition: ChainBehaviorDefinition<TContext, TPatch, TEvents>,
  options: ChainBehaviorOptions<TContext, TPatch, TEvents>
): ChainBehavior<TContext, TPatch> => {
  const runner = createBehaviorRunner<TContext, TPatch>(options)
  const bus = options.bus ?? (PubSubBehavior as BehaviorBus<TEvents>)
  const unsubscribers = new Set<() => void>()
  const lanes = new Map<string, RunLane>()
  const activeRuns = new Set<ActiveRun>()
  let runCount = 0

  runner.registerActions(definition.actions ?? {})
  runner.registerConditions(definition.conditions ?? {})

  const emitDiagnostic = (event: string, payload: Record<string, unknown>): void => {
    ;(bus as BehaviorBus<BehaviorEventMap>).emit(event, payload)
  }

  const clearQueuedRuns = (): void => {
    for (const [binding, lane] of lanes) {
      for (const input of lane.queue) {
        emitDiagnostic('cfb.run.dropped', { binding, input, reason: 'behavior-stopped' })
      }
      lane.queue = []
      if (!lane.active) {
        lanes.delete(binding)
      }
    }
  }

  const stop = (stopOptions: { force?: boolean } = {}): void => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
    unsubscribers.clear()
    clearQueuedRuns()
    if (stopOptions.force) {
      for (const run of activeRuns) {
        run.controller.abort()
      }
    }
  }

  const getContext = (): TContext =>
    typeof options.context === 'function' ? (options.context as () => TContext)() : options.context

  const getConcurrency = (target: SchedulableBinding): BehaviorConcurrencyOptions =>
    target.options?.concurrency ?? options.concurrency ?? {}

  const startRun = (
    binding: string,
    target: SchedulableBinding,
    input: BehaviorInput,
    key?: string,
    lane?: RunLane
  ): void => {
    const controller = new AbortController()
    const run: ActiveRun = { controller, id: `run-${++runCount}` }

    activeRuns.add(run)
    if (lane) {
      lane.active = run
    }

    emitDiagnostic('cfb.run.started', { binding, entrypoint: target.entrypoint, key, runId: run.id })

    void runner
      .run(target.entrypoint, getContext(), input, { signal: controller.signal })
      .then((result) => {
        const payload = { binding, entrypoint: target.entrypoint, key, runId: run.id }

        if (controller.signal.aborted) {
          emitDiagnostic('cfb.run.cancelled', payload)
        } else if (result.status === 'failed') {
          emitDiagnostic('cfb.run.failed', { ...payload, error: result.error })
          options.onRunnerError?.({
            error: result.error as NonNullable<typeof result.error>,
            result,
            binding,
            entrypoint: target.entrypoint,
            runId: run.id,
            ...(key === undefined ? {} : { key }),
          })
        } else {
          emitDiagnostic('cfb.run.finished', { ...payload, status: result.status })
        }
      })
      .catch((error) => {
        const payload = { binding, entrypoint: target.entrypoint, key, runId: run.id }

        emitDiagnostic(controller.signal.aborted ? 'cfb.run.cancelled' : 'cfb.run.failed', {
          ...payload,
          ...(controller.signal.aborted ? {} : { error }),
        })
      })
      .finally(() => {
        activeRuns.delete(run)
        if (lane && lane.active === run) {
          const nextInput = lane.queue.shift()

          lane.active = undefined
          if (nextInput) {
            startRun(binding, target, nextInput, key, lane)
          } else {
            lanes.delete(key as string)
          }
        }
      })
  }

  const scheduleRun = (binding: string, target: SchedulableBinding, input: BehaviorInput): void => {
    const concurrency = getConcurrency(target)
    const mode = concurrency.mode ?? 'parallel'

    if (mode === 'parallel') {
      startRun(binding, target, input)
    } else {
      const key = concurrency.key?.(input) ?? ''
      const laneKey = `${binding}:${key}`
      const lane = lanes.get(laneKey) ?? { queue: [] }

      lanes.set(laneKey, lane)
      if (!lane.active) {
        startRun(binding, target, input, key, lane)
      } else if (mode === 'latest') {
        lane.active.controller.abort()
        startRun(binding, target, input, key, lane)
      } else if (mode === 'drop') {
        emitDiagnostic('cfb.run.dropped', { binding, entrypoint: target.entrypoint, key, reason: 'run-active' })
      } else {
        const maxQueueSize = concurrency.maxQueueSize ?? defaultMaxQueueSize
        const queueIsFull = lane.queue.length >= maxQueueSize
        const dropsOldest = concurrency.overflow === 'drop-oldest'

        if (queueIsFull) {
          emitDiagnostic('cfb.queue.overflow', { binding, entrypoint: target.entrypoint, key, maxQueueSize })
          if (dropsOldest) {
            const dropped = lane.queue.shift()

            emitDiagnostic('cfb.run.dropped', {
              binding,
              entrypoint: target.entrypoint,
              key,
              reason: 'queue-overflow',
              ...(dropped ? { input: dropped } : {}),
            })
          } else {
            emitDiagnostic('cfb.run.dropped', { binding, entrypoint: target.entrypoint, key, reason: 'queue-overflow' })
          }
        }
        if (!queueIsFull || dropsOldest) {
          lane.queue.push(input)
        }
      }
    }
  }

  const subscribeBusBinding = (binding: string, target: BehaviorBusBinding): void => {
    const event = binding.slice(busBindingPrefix.length) as BehaviorEventName<TEvents>
    const unsubscribe = bus.on(event, (busEvent) => {
      scheduleRun(binding, target, busEvent.parsed as BehaviorInput)
    })

    unsubscribers.add(unsubscribe)
  }

  const parseDomBinding = (binding: string): { selector: string; eventType: string } | undefined => {
    const source = binding.slice(domBindingPrefix.length)
    const separator = source.lastIndexOf(':')
    if (separator <= 0 || separator === source.length - 1) {
      return undefined
    }
    return { selector: source.slice(0, separator), eventType: source.slice(separator + 1) }
  }

  const collectForm = (element: Element): BehaviorDomForm | undefined => {
    const form =
      typeof HTMLFormElement !== 'undefined' && element instanceof HTMLFormElement ? element : element.closest('form')
    if (!form) {
      return undefined
    }

    const values: BehaviorDomForm = {}
    for (const [name, value] of new FormData(form)) {
      const current = values[name]
      values[name] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value]
    }
    return values
  }

  const createDomInput = (event: Event, element: Element): BehaviorDomInput => {
    const value = 'value' in element && typeof element.value === 'string' ? element.value : undefined
    const form = collectForm(element)
    const dataset: Record<string, string> = {}
    if (element instanceof HTMLElement) {
      for (const [key, item] of Object.entries(element.dataset)) {
        if (item !== undefined) {
          dataset[key] = item
        }
      }
    }
    return {
      type: event.type,
      ...(value === undefined ? {} : { value }),
      dataset,
      ...(form ? { form } : {}),
    }
  }

  const subscribeDomBinding = (binding: string, target: BehaviorDomBinding): boolean => {
    const parsed = parseDomBinding(binding)
    const root = options.root ?? (typeof document === 'undefined' ? undefined : document)
    let active = false

    if (parsed && root) {
      let unsubscribe = (): void => undefined
      const listener = (event: Event): void => {
        const eventTarget = event.target

        if (typeof Element !== 'undefined' && eventTarget instanceof Element) {
          const element = eventTarget.closest(parsed.selector)
          const belongsToRoot =
            !element || typeof Element === 'undefined' || !(root instanceof Element) || root.contains(element)

          if (element && belongsToRoot) {
            const preventDefault = target.options?.preventDefault ?? event.type === 'submit'

            if (preventDefault) {
              event.preventDefault()
            }
            if (target.options?.stopPropagation) {
              event.stopPropagation()
            }

            const defaultInput = createDomInput(event, element)
            const input = target.options?.input?.({ event, element, defaultInput }) ?? defaultInput

            scheduleRun(binding, target, input)
            if (target.options?.once) {
              unsubscribe()
            }
          }
        }
      }

      const listenerOptions = target.options?.capture === undefined ? undefined : { capture: target.options.capture }

      root.addEventListener(parsed.eventType, listener, listenerOptions)
      unsubscribe = () => root.removeEventListener(parsed.eventType, listener, listenerOptions)
      unsubscribers.add(unsubscribe)
      active = true
    }

    return active
  }

  const start = (): BehaviorStartResult => {
    stop()

    const validation = runner.loadConfig(definition.config)
    const active: string[] = []
    const inactive: BehaviorStartResult['inactive'] = []

    if (validation.ok) {
      const bindings = Object.entries(definition.events ?? {}) as [string, BehaviorBusBinding | BehaviorDomBinding][]

      for (const [binding, target] of bindings) {
        if (binding.startsWith(busBindingPrefix)) {
          subscribeBusBinding(binding as BehaviorBusBindingKey<TEvents>, target as BehaviorBusBinding)
          active.push(binding)
        } else if (binding.startsWith(domBindingPrefix)) {
          if (subscribeDomBinding(binding as BehaviorDomBindingKey, target as BehaviorDomBinding)) {
            active.push(binding)
          } else {
            inactive.push({ binding, reason: 'dom-unavailable' })
          }
        } else {
          inactive.push({ binding, reason: 'unsupported-source' })
        }
      }
    }

    return { active, inactive, validation }
  }

  return { runner, start, stop }
}
