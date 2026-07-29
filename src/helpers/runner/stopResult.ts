import { type BehaviorActionStop } from '~/types'

export const stopResult = <TPatch>(reason?: string): BehaviorActionStop<TPatch> =>
  reason ? { type: 'stop', reason } : { type: 'stop' }
