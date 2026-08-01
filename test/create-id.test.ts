import assert from 'node:assert/strict'
import { afterEach, describe, it, vi } from 'vitest'
import { createId } from '~/helpers/ids/createId'

describe('createId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates distinct base62 runtime identifiers', () => {
    const first = createId()
    const second = createId()

    assert.match(first, /^[A-Za-z0-9]{12}$/)
    assert.notEqual(first, second)
  })

  it('uses Web Crypto when it is available', () => {
    const crypto = {
      getRandomValues: (values: Uint32Array): Uint32Array => {
        values.fill(0)

        return values
      },
    } as unknown as Crypto

    vi.stubGlobal('crypto', crypto)

    assert.equal(createId(), 'AAAAAAAAAAAA')
  })

  it('falls back to Math.random when Web Crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined)
    vi.spyOn(Math, 'random').mockReturnValue(0)

    assert.equal(createId(), 'AAAAAAAAAAAA')
  })
})
