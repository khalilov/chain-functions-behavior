import { createBehaviorRunner, defineBehaviorConfig } from '~/index'

interface ServicePipelineContext {
  service: { id: string; status: 'ready' | 'paused'; pendingTasks: number }
  now: number
}

export const servicePipelineBehavior = defineBehaviorConfig({
  version: 1,
  entrypoints: { 'service.tick': 'service.tick' },
  strategies: {
    'service.tick': {
      fn: 'core.sequence',
      mode: 'sequence',
      then: ['service.processPending', 'service.emitStatus'],
    },
    'service.processPending': { fn: 'service.processPending' },
    'service.emitStatus': {
      fn: 'core.emit',
      props: { type: 'service.status', payload: { serviceId: '$context.service.id' } },
    },
  },
})

export const createServicePipelineRunner = () => {
  const runner = createBehaviorRunner<ServicePipelineContext>()
  runner.loadConfig(servicePipelineBehavior)
  return runner
}
