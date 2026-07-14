import {
  type BehaviorBus,
  type BehaviorEventMap,
  type BehaviorEventName,
  type BehaviorWs,
  type BehaviorWsOptions,
  type BehaviorWsSocket,
  type BehaviorWsStatus,
} from '~/types'

const openState = 1
const maxSeenEvents = 1_000

export const createBehaviorWs = <TEvents extends object = BehaviorEventMap>(
  options: BehaviorWsOptions<TEvents>
): BehaviorWs => {
  const inboundTopics = new Set<string>(options.inboundTopics ?? [])
  const outboundTopics = new Set<string>(options.outboundTopics ?? [])
  const seenEventIds = new Set<string>()
  const outboundUnsubscribers = new Set<() => void>()
  const socketUnsubscribers = new Set<() => void>()
  let socket: BehaviorWsSocket | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let retryAttempt = 0
  let started = false
  let currentStatus: BehaviorWsStatus = 'idle'
  const diagnosticsBus = options.bus as unknown as BehaviorBus<BehaviorEventMap>

  const emitDiagnostic = (topic: string, payload: Record<string, unknown>): void => {
    diagnosticsBus.emit(topic, payload, {
      ...(options.origin ? { origin: options.origin } : {}),
    })
  }

  const rememberEvent = (id: string): void => {
    seenEventIds.add(id)
    if (seenEventIds.size > maxSeenEvents) {
      const oldest = seenEventIds.values().next()

      if (!oldest.done) {
        seenEventIds.delete(oldest.value)
      }
    }
  }

  const clearSocket = (): void => {
    for (const unsubscribe of socketUnsubscribers) {
      unsubscribe()
    }
    socketUnsubscribers.clear()
    socket = undefined
  }

  const getRetryDelay = (): number => {
    const initialDelay = options.retry?.initialDelay ?? 500
    const maxDelay = options.retry?.maxDelay ?? 10_000
    const multiplier = options.retry?.multiplier ?? 2
    const base = Math.min(initialDelay * multiplier ** retryAttempt, maxDelay)
    return options.retry?.jitter === false ? base : Math.round(base * (0.5 + Math.random() * 0.5))
  }

  const connect = (): void => {
    if (started && !socket) {
      currentStatus = 'connecting'
      emitDiagnostic('cfb.ws.connecting', { attempt: retryAttempt })

      try {
        const current = options.createSocket()
        socket = current
        const listen = (type: 'open' | 'close' | 'error' | 'message', listener: EventListener): void => {
          current.addEventListener(type, listener)
          socketUnsubscribers.add(() => current.removeEventListener(type, listener))
        }
        const disconnect = (reason: string): void => {
          if (socket === current) {
            clearSocket()

            if (started) {
              const delay = getRetryDelay()
              const attempt = retryAttempt + 1
              const retry = (): void => {
                retryTimer = undefined
                connect()
              }

              currentStatus = 'retrying'
              retryAttempt = attempt
              retryTimer = setTimeout(retry, delay)
              emitDiagnostic('cfb.ws.retrying', { reason, delay, attempt })
            }
          }
        }

        listen('open', () => {
          if (socket === current) {
            retryAttempt = 0
            currentStatus = 'connected'
            emitDiagnostic('cfb.ws.connected', {})
          }
        })
        listen('close', () => disconnect('close'))
        listen('error', () => disconnect('error'))
        listen('message', (event) => {
          const data = (event as MessageEvent).data

          if (typeof data === 'string') {
            try {
              const busEvent = JSON.parse(data) as { topic?: string; id?: string }
              if (busEvent.topic && inboundTopics.has(busEvent.topic)) {
                if (busEvent.id) {
                  rememberEvent(busEvent.id)
                }
                if (!options.bus.dispatch(busEvent)) {
                  emitDiagnostic('cfb.ws.message.rejected', { reason: 'invalid-envelope', topic: busEvent.topic })
                }
              } else {
                emitDiagnostic('cfb.ws.message.rejected', { reason: 'topic-not-allowed', topic: busEvent.topic })
              }
            } catch (error) {
              emitDiagnostic('cfb.ws.message.rejected', { reason: 'message-parse-failed', error: String(error) })
            }
          } else {
            emitDiagnostic('cfb.ws.message.rejected', { reason: 'message-not-string' })
          }
        })
      } catch (error) {
        const delay = getRetryDelay()
        const attempt = retryAttempt + 1
        const retry = (): void => {
          retryTimer = undefined
          connect()
        }

        currentStatus = 'retrying'
        retryAttempt = attempt
        retryTimer = setTimeout(retry, delay)
        emitDiagnostic('cfb.ws.retrying', { reason: 'socket-create-failed', delay, attempt, error: String(error) })
      }
    }
  }

  const start = (): void => {
    if (!started) {
      started = true
      for (const topic of outboundTopics) {
        const unsubscribe = options.bus.on(topic as BehaviorEventName<TEvents>, (event) => {
          if (!seenEventIds.delete(event.id) && event.origin !== options.origin && socket?.readyState === openState) {
            socket.send(event.serialized)
          }
        })
        outboundUnsubscribers.add(unsubscribe)
      }
      connect()
    }
  }

  const stop = (): void => {
    started = false
    if (retryTimer) {
      clearTimeout(retryTimer)
    }
    retryTimer = undefined
    for (const unsubscribe of outboundUnsubscribers) {
      unsubscribe()
    }
    outboundUnsubscribers.clear()
    const current = socket
    clearSocket()
    current?.close()
    currentStatus = 'stopped'
    emitDiagnostic('cfb.ws.disconnected', { reason: 'stopped' })
  }

  const reconnect = (): void => {
    if (started) {
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
      const current = socket

      retryTimer = undefined
      clearSocket()
      current?.close()
      connect()
    }
  }

  return { start, stop, reconnect, status: () => currentStatus }
}
