import { type BehaviorTraceEntry, type BehaviorTraceSink } from '~/types'

export const createMemoryTraceSink = (): BehaviorTraceSink => {
  const items: BehaviorTraceEntry[] = []
  return {
    push: (entry) => {
      items.push(entry)
    },
    entries: () => [...items],
  }
}
