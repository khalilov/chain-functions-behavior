import { behaviorError } from '~/helpers/errors/behaviorError'
import { type ResolveScope } from '~/helpers/path/resolveValue'
import { ResolutionError } from '~/helpers/path/ResolutionError'

export const createResolutionError = (
  code: string,
  message: string,
  scope: ResolveScope<unknown>,
  path: string
): ResolutionError =>
  new ResolutionError(
    behaviorError(code, message, {
      ...(scope.strategy ? { strategy: scope.strategy } : {}),
      path,
    })
  )
