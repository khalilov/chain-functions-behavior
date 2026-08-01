import {
  type BehaviorActionArgs,
  type BehaviorActionResult,
  type BehaviorFetchResponseType,
  type BehaviorRetryOptions,
} from '~/types'
import { getRetryDelay } from '~/helpers/retry/getRetryDelay'
import { waitForRetry } from '~/helpers/retry/waitForRetry'

const defaultMaxAttempts = 2
const retryableStatuses = new Set([408, 425, 429])

const responseReaders = {
  json: (response: Response) => response.json(),
  text: (response: Response) => response.text(),
  blob: (response: Response) => response.blob(),
  arrayBuffer: (response: Response) => response.arrayBuffer(),
  none: async () => undefined,
} satisfies Record<BehaviorFetchResponseType, (response: Response) => Promise<unknown>>

export const coreFetch = async <TContext, TPatch>({
  props,
  runtime,
  signal,
}: BehaviorActionArgs<TContext>): Promise<BehaviorActionResult<TContext, TPatch>> => {
  const {
    acceptStatuses,
    body,
    contextPath,
    dataPath,
    headers,
    method,
    response,
    retry: retryProps,
    retryStatuses,
    url,
  } = props
  const responseType = typeof response === 'string' ? response : 'json'
  const retry = (retryProps ?? {}) as BehaviorRetryOptions
  const maxAttempts = Math.max(0, Number(retry.maxAttempts ?? defaultMaxAttempts))
  const acceptedStatusSet = Array.isArray(acceptStatuses) ? new Set(acceptStatuses) : undefined
  const retryStatusSet = Array.isArray(retryStatuses) ? new Set(retryStatuses) : undefined

  if (typeof url !== 'string' || !url) {
    return runtime.fail('core.fetch requires a non-empty url')
  }
  if (!Object.prototype.hasOwnProperty.call(responseReaders, responseType)) {
    return runtime.fail('core.fetch response must be json, text, blob, arrayBuffer, or none')
  }

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    try {
      const request: RequestInit = {
        signal,
        ...(typeof method === 'string' ? { method } : {}),
        ...(headers ? { headers: headers as HeadersInit } : {}),
        ...(body === undefined ? {} : { body: body as BodyInit | null }),
      }
      const response = await fetch(url, request)
      const accepted = acceptedStatusSet?.has(response.status) ?? response.ok

      if (accepted) {
        const responseBody = await responseReaders[responseType as BehaviorFetchResponseType](response)
        const result = {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers),
          body: responseBody,
        }

        if (typeof dataPath === 'string') {
          runtime.data.set(dataPath, result)
        }
        if (typeof contextPath === 'string') {
          runtime.set(contextPath, result)
        }

        return
      }
      const retryableStatus =
        retryStatusSet?.has(response.status) ?? (retryableStatuses.has(response.status) || response.status >= 500)
      if (attempt === maxAttempts || !retryableStatus) {
        return runtime.fail(`Fetch request failed with status ${response.status}`, { status: response.status })
      }
    } catch (cause) {
      if (signal.aborted) {
        return runtime.fail('Fetch request was aborted')
      }
      if (attempt === maxAttempts) {
        return runtime.fail('Fetch request failed', { cause })
      }
    }

    try {
      await waitForRetry(getRetryDelay(attempt, retry), signal)
    } catch (cause) {
      return signal.aborted
        ? runtime.fail('Fetch request was aborted')
        : runtime.fail('Fetch retry was interrupted', { cause })
    }
  }
}
