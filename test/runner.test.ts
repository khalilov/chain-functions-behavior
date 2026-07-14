import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { createBehaviorRunner, defineBehaviorConfig } from '~/index'

type Ctx = {
  worker?: { state?: string; queueSize?: number }
  now?: number
  last?: number
  log?: string[]
}

describe('behavior runner', () => {
  it('sequence executes in order and collects patches', async () => {
    const runner = createBehaviorRunner<Ctx, string>()
    runner.registerActions({
      a: () => ({ patch: 'a' }),
      b: () => ({ patch: 'b' }),
    })
    runner.loadConfig(
      defineBehaviorConfig({
        strategies: {
          root: { fn: 'core.sequence', mode: 'sequence', then: ['sa', 'sb'] },
          sa: { fn: 'a' },
          sb: { fn: 'b' },
        },
      })
    )

    const result = await runner.run('root', {})
    assert.equal(result.status, 'success')
    assert.deepEqual(result.patches, ['a', 'b'])
  })

  it('selector stops on first successful branch and treats false as skip', async () => {
    const runner = createBehaviorRunner<Ctx, string>()
    runner.registerActions({
      skip: () => false,
      win: () => ({ patch: 'win' }),
      later: () => ({ patch: 'later' }),
    })
    runner.loadConfig({
      strategies: {
        root: { fn: 'core.selector', mode: 'selector', then: ['skip', 'win', 'later'] },
        skip: { fn: 'skip' },
        win: { fn: 'win' },
        later: { fn: 'later' },
      },
    })

    const result = await runner.run('root', {})
    assert.equal(result.status, 'success')
    assert.deepEqual(result.patches, ['win'])
  })

  it('thrown error invokes catch', async () => {
    const runner = createBehaviorRunner<Ctx, string>()
    runner.registerActions({
      boom: () => {
        throw new Error('boom')
      },
      recover: () => ({ patch: 'recovered' }),
    })
    runner.loadConfig({ strategies: { root: { fn: 'boom', catch: ['recover'] }, recover: { fn: 'recover' } } })

    const result = await runner.run('root', {})
    assert.equal(result.status, 'success')
    assert.deepEqual(result.patches, ['recovered'])
  })

  it('reports missing action and missing strategy', async () => {
    const runner = createBehaviorRunner<Ctx>()
    runner.loadConfig({ strategies: { root: { fn: 'missing' } } })
    assert.equal((await runner.run('root', {})).error?.code, 'ACTION_NOT_FOUND')
    assert.equal((await runner.run('absent', {})).error?.code, 'STRATEGY_NOT_FOUND')
  })

  it('when reads context, data and input', async () => {
    const runner = createBehaviorRunner<Ctx, string>()
    runner.registerAction('mark', () => ({ patch: 'ok' }))
    runner.loadConfig({
      strategies: {
        root: { fn: 'core.sequence', then: ['set', 'mark'] },
        set: { fn: 'core.set', props: { path: 'target', value: '$input.target' } },
        mark: {
          fn: 'mark',
          when: ['and', ['eq', '$context.worker.state', 'idle'], ['eq', '$data.target', '$input.target']],
        },
      },
    })
    const result = await runner.run('root', { worker: { state: 'idle' } }, { target: 'job-1' })
    assert.deepEqual(result.patches, ['ok'])
  })

  it('runSync throws on async action', () => {
    const runner = createBehaviorRunner<Ctx>()
    runner.loadConfig({ strategies: { root: { fn: 'core.delay', props: { ms: 0 } } } })
    assert.throws(() => runner.runSync('root', {}), /async action|Promise/)
  })

  it('maxSteps stops cycles', async () => {
    const runner = createBehaviorRunner<Ctx>({ maxSteps: 3 })
    runner.loadConfig({ strategies: { root: { fn: 'core.noop', then: ['root'] } } })
    const result = await runner.run('root', {})
    assert.equal(result.status, 'failed')
    assert.equal(result.error?.code, 'MAX_STEPS')
  })

  it('trace contains strategy props status and duration', async () => {
    const runner = createBehaviorRunner<Ctx>({ trace: true })
    runner.loadConfig({ strategies: { root: { fn: 'core.noop', props: { x: 1 } } } })
    const result = await runner.run('root', {})
    assert.deepEqual(
      {
        strategy: result.trace?.[0]?.strategy,
        props: result.trace?.[0]?.props,
        status: result.trace?.[0]?.status,
      },
      { strategy: 'root', props: { x: 1 }, status: 'success' }
    )
    assert.equal(typeof result.trace?.[0]?.durationMs, 'number')
  })

  it('parallel preserves patch order from config', async () => {
    const runner = createBehaviorRunner<Ctx, string>()
    runner.registerActions({
      slow: async () => {
        await new Promise((r) => setTimeout(r, 5))
        return { patch: 'slow' }
      },
      fast: () => ({ patch: 'fast' }),
    })
    runner.loadConfig({
      strategies: {
        root: { fn: 'core.parallel', mode: 'parallel', then: ['slow', 'fast'] },
        slow: { fn: 'slow' },
        fast: { fn: 'fast' },
      },
    })
    const result = await runner.run('root', {})
    assert.deepEqual(result.patches, ['slow', 'fast'])
  })

  it('ui flow returns events', async () => {
    const runner = createBehaviorRunner<Ctx>()
    runner.loadConfig({
      strategies: { root: { fn: 'core.emit', props: { type: 'ui.message', payload: { text: 'ok' } } } },
    })
    const result = await runner.run('root', {})
    assert.deepEqual(result.events, [{ type: 'ui.message', payload: { text: 'ok' } }])
  })
})
