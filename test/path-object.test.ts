import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { pick, set } from 'objwalk'
import { isPathReference } from '~/helpers/path/isPathReference'
import { isValidPathReference } from '~/helpers/path/isValidPathReference'
import { resolveValue } from '~/helpers/path/resolveValue'

describe('path and object helpers', () => {
  it('gets nested values and array indexes through objwalk path syntax', () => {
    const source = { user: { name: 'Ada', jobs: [{ id: 'a' }] } }

    assert.equal(pick(source, ''), source)
    assert.equal(pick(source, 'user.name'), 'Ada')
    assert.equal(pick(source, 'user.jobs[0].id'), 'a')
    assert.equal(pick(source, 'user.jobs[1].id'), undefined)
  })

  it('sets nested values and array indexes through objwalk path syntax', () => {
    const target: Record<string, unknown> = {}

    set(target, 'user.name', 'Ada')
    set(target, 'user.jobs[0].id', 'a')

    assert.deepEqual(target, { user: { name: 'Ada', jobs: [{ id: 'a' }] } })
  })

  it('picks object fields and key lists by path suffix', () => {
    const source = { user: { name: 'Ada', role: 'admin', extra: true } }

    assert.deepEqual(pick(source, 'user{name,role}'), { name: 'Ada', role: 'admin' })
    assert.equal(pick(source, 'user{name}'), 'Ada')
    assert.deepEqual(pick(source, 'user{*}'), ['name', 'role', 'extra'])
  })

  it('sets arrays through objwalk path syntax', () => {
    const target: Record<string, unknown> = {}

    set(target, 'items[1].name', 'second')

    assert.equal((target.items as unknown[]).length, 2)
    assert.deepEqual((target.items as unknown[])[1], { name: 'second' })
    assert.equal(pick(target, 'items[1].name'), 'second')
  })

  it('detects and validates path references', () => {
    assert.equal(isPathReference('$context.user'), true)
    assert.equal(isPathReference('context.user'), false)
    assert.equal(isValidPathReference('$context.user.name'), true)
    assert.equal(isValidPathReference('$data.items[0].id'), true)
    assert.equal(isValidPathReference('$input'), true)
    assert.equal(isValidPathReference('$unknown.user'), false)
    assert.equal(isValidPathReference('$context.user name'), false)
  })

  it('resolves path references and object templates recursively', () => {
    const scope = {
      context: { user: { name: 'Ada' } },
      data: { greeting: 'hello', target: 'world' },
      input: { id: 'job-1' },
    }

    assert.equal(resolveValue('$context.user.name', scope), 'Ada')
    assert.equal(resolveValue('$input.id', scope), 'job-1')
    assert.deepEqual(resolveValue(['$data.greeting', '$data.target'], scope), ['hello', 'world'])
    assert.deepEqual(resolveValue({ id: '$input.id', message: { $template: '{{ greeting }}, {{ target }}' } }, scope), {
      id: 'job-1',
      message: 'hello, world',
    })
  })
})
