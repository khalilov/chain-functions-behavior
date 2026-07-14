import { createBehaviorRunner, defineBehaviorConfig } from '~/index'

interface JobWorkerContext {
  worker: { id: string; state: 'idle' | 'busy'; queueSize: number }
  system: { limits: { maxQueueSize: number } }
  now: number
}

export const jobWorkerBehavior = defineBehaviorConfig({
  version: 1,
  entrypoints: { 'worker.tick': 'worker.tick' },
  strategies: {
    'worker.tick': {
      fn: 'core.selector',
      mode: 'selector',
      then: ['worker.pickQueuedJob', 'worker.idle'],
    },
    'worker.pickQueuedJob': {
      fn: 'jobs.findNext',
      when: ['and', ['eq', '$context.worker.state', 'idle'], ['gt', '$context.worker.queueSize', 0]],
      then: ['jobs.reserve', 'jobs.execute'],
    },
    'worker.idle': { fn: 'worker.idle' },
    'jobs.reserve': { fn: 'jobs.reserve' },
    'jobs.execute': { fn: 'jobs.execute' },
  },
})

export const createJobWorkerRunner = () => {
  const runner = createBehaviorRunner<JobWorkerContext>()
  runner.loadConfig(jobWorkerBehavior)
  return runner
}
