export const parseDomBinding = (
  binding: string,
  prefix: string
): { selector: string; eventType: string } | undefined => {
  const source = binding.slice(prefix.length)
  const separator = source.lastIndexOf(':')

  return separator <= 0 || separator === source.length - 1
    ? undefined
    : { selector: source.slice(0, separator), eventType: source.slice(separator + 1) }
}
