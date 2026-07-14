import {
  type BehaviorBus,
  type BehaviorBusErrorEvent,
  type BehaviorBusEvent,
  type BehaviorBusEmitOptions,
  type BehaviorBusOptions,
  type BehaviorEventHandler,
  type BehaviorEventMap,
  type BehaviorEventName,
} from '~/types'
import { nanoid } from 'nanoid'

const serializeError = (error: unknown): { error: string } => ({
  error: error instanceof Error ? error.message : String(error),
})

const isBusEvent = (event: unknown): event is BehaviorBusEvent => {
  if (!event || typeof event !== 'object') {
    return false
  }
  const candidate = event as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.topic === 'string' &&
    typeof candidate.occurredAt === 'number' &&
    typeof candidate.serialized === 'string' &&
    'parsed' in candidate &&
    (candidate.origin === undefined || typeof candidate.origin === 'string')
  )
}

export const createPubSubBehavior = <TEvents extends object = BehaviorEventMap>(
  options: BehaviorBusOptions<TEvents> = {}
): BehaviorBus<TEvents> => {
  const subscribers = new Map<string, Set<(event: BehaviorBusEvent<unknown>) => void>>()

  const dispatch = (event: unknown): BehaviorBusEvent | undefined => {
    let dispatchedEvent: BehaviorBusEvent | undefined

    if (!isBusEvent(event)) {
      options.onError?.({
        type: 'serialization',
        topic: 'unknown' as BehaviorEventName<TEvents>,
        payload: event as TEvents[BehaviorEventName<TEvents>],
        error: new Error('Invalid behavior bus event'),
      })
    } else {
      const handlers = subscribers.get(event.topic)

      if (handlers) {
        for (const handler of [...handlers]) {
          try {
            handler(event as BehaviorBusEvent<unknown>)
          } catch (error) {
            options.onError?.({ type: 'subscriber', event, error } as BehaviorBusErrorEvent<TEvents>)
          }
        }
      }
      dispatchedEvent = event
    }

    return dispatchedEvent
  }

  const on = <TEvent extends BehaviorEventName<TEvents>>(
    event: TEvent,
    handler: BehaviorEventHandler<TEvents, TEvent>
  ) => {
    const handlers = subscribers.get(event) ?? new Set<(event: BehaviorBusEvent<unknown>) => void>()
    const listener = handler as (event: BehaviorBusEvent<unknown>) => void

    handlers.add(listener)
    subscribers.set(event, handlers)

    return () => off(event, handler)
  }

  const off = <TEvent extends BehaviorEventName<TEvents>>(
    event: TEvent,
    handler?: BehaviorEventHandler<TEvents, TEvent>
  ) => {
    if (handler) {
      const handlers = subscribers.get(event)

      if (handlers) {
        handlers.delete(handler as (event: BehaviorBusEvent<unknown>) => void)
        if (handlers.size === 0) {
          subscribers.delete(event)
        }
      }
    } else {
      subscribers.delete(event)
    }
  }

  const emit = <TEvent extends BehaviorEventName<TEvents>>(
    topic: TEvent,
    payload: TEvents[TEvent],
    emitOptions: BehaviorBusEmitOptions = {}
  ): BehaviorBusEvent<TEvents[TEvent]> => {
    let event: BehaviorBusEvent<TEvents[TEvent]>

    try {
      const serialized = JSON.stringify(payload)
      if (typeof serialized !== 'string') {
        throw new Error('Payload cannot be serialized')
      }
      event = {
        id: nanoid(),
        topic,
        occurredAt: Date.now(),
        ...(emitOptions.origin ? { origin: emitOptions.origin } : {}),
        parsed: payload,
        serialized,
      }
    } catch (error) {
      const parsed = serializeError(error)
      event = {
        id: nanoid(),
        topic,
        occurredAt: Date.now(),
        ...(emitOptions.origin ? { origin: emitOptions.origin } : {}),
        parsed: parsed as TEvents[TEvent],
        serialized: JSON.stringify(parsed),
      }
      options.onError?.({
        type: 'serialization',
        topic,
        payload,
        ...(emitOptions.origin ? { origin: emitOptions.origin } : {}),
        error,
      } as BehaviorBusErrorEvent<TEvents>)
    }

    return dispatch(event) as BehaviorBusEvent<TEvents[TEvent]>
  }

  return { on, off, emit, dispatch }
}

export const PubSubBehavior = createPubSubBehavior()
