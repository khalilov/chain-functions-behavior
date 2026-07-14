import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { createBehaviorRunner, createMemoryTraceSink } from '~/index'
import { createRuntime } from '~/helpers/runner/createRuntime'
import { type RunState } from '~/helpers/runner/runnerTypes'
import { type BehaviorTraceEntry } from '~/types'

type Ctx = {
  user?: {
    name?: string
  }
}

describe('validation', () => {
  it('reports invalid config shapes and strategy fields', () => {
    const runner = createBehaviorRunner<Ctx>()

    assert.deepEqual(
      runner.validateConfig(undefined).errors.map((error) => error.code),
      ['CONFIG_INVALID']
    )

    const result = runner.validateConfig({
      strategies: {
        root: { fn: '', mode: 'invalid' as never },
      },
    })

    assert.equal(result.ok, false)
    assert.deepEqual(new Set(result.errors.map((error) => error.code)), new Set(['FN_MISSING', 'MODE_INVALID']))
  })

  it('reports missing then, catch and entrypoint targets', () => {
    const runner = createBehaviorRunner<Ctx>()
    const result = runner.validateConfig({
      entrypoints: { start: 'missing.entrypoint' },
      strategies: {
        root: { fn: 'core.noop', then: ['missing.then'], catch: ['missing.catch'] },
      },
    })

    assert.deepEqual(new Set(result.errors.map((error) => error.code)), new Set(['STRATEGY_NOT_FOUND']))
    assert.equal(result.errors.length, 3)
  })

  it('reports invalid path refs in props and nested conditions', () => {
    const runner = createBehaviorRunner<Ctx>()
    const result = runner.validateConfig({
      strategies: {
        root: {
          fn: 'core.noop',
          props: { value: '$bad.path' },
          when: ['and', ['eq', '$context.user.name', '$wat.value']],
        },
      },
    })

    assert.equal(result.ok, false)
    assert.deepEqual(result.errors.map((error) => error.code).sort(), ['PATH_INVALID', 'PATH_INVALID'])
  })

  it('treats cycles without terminal as errors and terminal cycles as warnings', () => {
    const runner = createBehaviorRunner<Ctx>()
    const invalid = runner.validateConfig({
      strategies: {
        root: { fn: 'core.noop', then: ['again'] },
        again: { fn: 'core.noop', then: ['root'] },
      },
    })
    const terminal = runner.validateConfig({
      strategies: {
        root: { fn: 'core.noop', then: ['again'] },
        again: { fn: 'core.noop', terminal: true, then: ['root'] },
      },
    })

    assert.equal(
      invalid.errors.some((error) => error.code === 'CYCLE_DETECTED'),
      true
    )
    assert.equal(terminal.ok, true)
    assert.equal(
      terminal.warnings.some((warning) => warning.code === 'CYCLE_DETECTED'),
      true
    )
  })
})

describe('runtime helpers', () => {
  it('reads, writes, resolves, emits, patches, stops and fails through runtime', () => {
    const state: RunState<Ctx, string> = {
      context: { user: { name: 'Ada' } },
      input: { job: { id: 'job-1' } },
      data: {},
      patches: [],
      events: [],
      steps: 0,
      startedAt: Date.now(),
      sync: false,
      signal: new AbortController().signal,
      reportedErrors: [],
    }
    const runtime = createRuntime(state)

    runtime.setData('job.id', runtime.resolve('$input.job.id'))
    runtime.emit({ type: 'job.selected', payload: runtime.getData('job.id') })
    runtime.patch('patch-1')

    assert.equal(runtime.get('user.name'), 'Ada')
    assert.equal(runtime.getData('job.id'), 'job-1')
    assert.deepEqual(state.events, [{ type: 'job.selected', payload: 'job-1' }])
    assert.deepEqual(state.patches, ['patch-1'])
    assert.deepEqual(runtime.stop('done'), { type: 'stop', reason: 'done' })
    assert.deepEqual(runtime.fail('failed', { id: 'job-1' }), {
      type: 'fail',
      reason: 'failed',
      data: { id: 'job-1' },
    })
  })
})

describe('trace and safety limits', () => {
  it('does not return trace by default and returns memory trace when enabled', async () => {
    const withoutTrace = createBehaviorRunner<Ctx>()
    withoutTrace.loadConfig({ strategies: { root: { fn: 'core.noop' } } })

    assert.equal((await withoutTrace.run('root', {})).trace, undefined)

    const withTrace = createBehaviorRunner<Ctx>({ trace: true })
    withTrace.loadConfig({ strategies: { root: { fn: 'core.set', props: { path: 'seen', value: true } } } })

    const result = await withTrace.run('root', {})

    assert.equal(result.trace?.length, 1)
    assert.deepEqual(
      {
        step: result.trace?.[0]?.step,
        depth: result.trace?.[0]?.depth,
        strategy: result.trace?.[0]?.strategy,
        fn: result.trace?.[0]?.fn,
        status: result.trace?.[0]?.status,
        dataBefore: result.trace?.[0]?.dataBefore,
        dataAfter: result.trace?.[0]?.dataAfter,
      },
      {
        step: 1,
        depth: 0,
        strategy: 'root',
        fn: 'core.set',
        status: 'success',
        dataBefore: {},
        dataAfter: { seen: true },
      }
    )
  })

  it('pushes trace entries into a custom trace sink', async () => {
    const entries: BehaviorTraceEntry[] = []
    const runner = createBehaviorRunner<Ctx>({
      trace: {
        push: (entry) => entries.push(entry),
        entries: () => entries,
      },
    })

    runner.loadConfig({ strategies: { root: { fn: 'core.noop' } } })

    const result = await runner.run('root', {})

    assert.equal(result.trace, entries)
    assert.equal(entries[0]?.strategy, 'root')
  })

  it('creates an isolated memory trace sink', () => {
    const sink = createMemoryTraceSink()

    sink.push({
      step: 1,
      depth: 0,
      strategy: 'root',
      fn: 'core.noop',
      mode: undefined,
      status: 'success',
      input: {},
      props: {},
      dataBefore: {},
      dataAfter: {},
      durationMs: 0,
    })

    assert.equal(sink.entries?.().length, 1)
  })

  it('returns limit errors for maxDepth and timeoutMs', async () => {
    const depthRunner = createBehaviorRunner<Ctx>({ maxDepth: 0 })
    depthRunner.loadConfig({
      strategies: {
        root: { fn: 'core.noop', then: ['next'] },
        next: { fn: 'core.noop' },
      },
    })

    assert.equal((await depthRunner.run('root', {})).error?.code, 'MAX_DEPTH')

    const timeoutRunner = createBehaviorRunner<Ctx>({ timeoutMs: 1 })
    timeoutRunner.registerAction('slow', async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
    timeoutRunner.loadConfig({
      strategies: {
        root: { fn: 'slow', then: ['next'] },
        next: { fn: 'core.noop' },
      },
    })

    assert.equal((await timeoutRunner.run('root', {})).error?.code, 'TIMEOUT')
  })
})
