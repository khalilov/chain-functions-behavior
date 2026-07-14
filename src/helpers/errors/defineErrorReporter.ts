import { type BehaviorErrorReporter, type BehaviorErrorReporterHandlers } from '~/types'

export const defineErrorReporter = <TContext, TPatch = unknown>(
  handlers: BehaviorErrorReporterHandlers<TContext, TPatch> | BehaviorErrorReporter<TContext, TPatch>
): BehaviorErrorReporter<TContext, TPatch> => (typeof handlers === 'function' ? handlers : handlers.report)
