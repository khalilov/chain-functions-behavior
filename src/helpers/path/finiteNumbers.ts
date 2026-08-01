import { type ExpressionDetails } from '~/helpers/path/expressionDetails'
import { failExpression } from '~/helpers/path/failExpression'

export const finiteNumbers = (
  operator: string,
  args: unknown[],
  count: number | [number, number],
  details: ExpressionDetails
): number[] => {
  const [minimum, maximum] = typeof count === 'number' ? [count, count] : count

  if (
    args.length < minimum ||
    args.length > maximum ||
    args.some((value) => typeof value !== 'number' || !Number.isFinite(value))
  ) {
    failExpression('EXPRESSION_INVALID_ARGUMENT', `Expression "${operator}" requires finite number arguments`, details)
  }

  return args as number[]
}
