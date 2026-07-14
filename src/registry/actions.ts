import { type BehaviorAction } from '~/types'
import { coreDelay } from '~/helpers/actions/coreDelay'
import { coreEmit } from '~/helpers/actions/coreEmit'
import { coreFail } from '~/helpers/actions/coreFail'
import { coreNoop } from '~/helpers/actions/coreNoop'
import { corePatch } from '~/helpers/actions/corePatch'
import { coreSetData } from '~/helpers/actions/coreSetData'
import { coreStop } from '~/helpers/actions/coreStop'

export type ActionsRegistry<TContext, TPatch> = Map<string, BehaviorAction<TContext, TPatch>>

export const createActionsRegistry = <TContext, TPatch>(): ActionsRegistry<TContext, TPatch> =>
  new Map<string, BehaviorAction<TContext, TPatch>>([
    ['core.noop', coreNoop()],
    ['core.stop', coreStop()],
    ['core.fail', coreFail()],
    ['core.sequence', coreNoop()],
    ['core.selector', coreNoop()],
    ['core.parallel', coreNoop()],
    ['core.set', coreSetData()],
    ['core.setData', coreSetData()],
    ['core.emit', coreEmit()],
    ['core.patch', corePatch()],
    ['core.delay', coreDelay()],
  ])
