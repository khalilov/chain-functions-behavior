import assert from 'node:assert/strict'
import { test } from 'vitest'
import { catchError } from '~/index'

void test('catchError resolves a synchronous callback result', async () => {
  const result = await catchError(() => JSON.stringify({ id: 1 }))

  assert.equal(result, '{"id":1}')
})

void test('catchError rejects synchronous errors and runs finally', async () => {
  let finalized = false
  const circular: Record<string, unknown> = {}

  circular.self = circular

  await catchError(() => JSON.stringify(circular))
    .then(() => assert.fail('Expected serialization to fail'))
    .catch((error: unknown) => assert.match(String(error), /circular/i))
    .finally(() => {
      finalized = true
    })

  assert.equal(finalized, true)
})

void test('catchError preserves rejected promises', async () => {
  await assert.rejects(
    catchError(() => Promise.reject(new Error('failed'))),
    /failed/
  )
})
