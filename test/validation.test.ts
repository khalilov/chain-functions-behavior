import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { createBehaviorRunner } from '~/index'

describe('validation', () => {
  it('catches unknown fn, then target and condition', () => {
    const runner = createBehaviorRunner()
    const result = runner.validateConfig({
      strategies: {
        root: { fn: 'missing.action', then: ['missing.strategy'], when: ['missingCondition', '$context.worker'] },
      },
    })
    assert.equal(result.ok, false)
    assert.deepEqual(
      new Set(result.errors.map((error) => error.code)),
      new Set(['ACTION_NOT_FOUND', 'STRATEGY_NOT_FOUND', 'CONDITION_NOT_FOUND'])
    )
  })
})
