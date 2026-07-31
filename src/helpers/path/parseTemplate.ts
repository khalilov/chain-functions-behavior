export type TemplatePart =
  | { type: 'literal'; value: string }
  | { type: 'variable'; name: string; fallback?: string }
  | { type: 'data'; path: string }

export type ParseTemplateResult = { ok: true; parts: TemplatePart[] } | { ok: false }

const variablePattern = /^([A-Za-z_$][A-Za-z0-9_$]*)(?::-([^}]*))?$/
const dataPathPattern = /^[A-Za-z0-9_$.[\]-]+$/

export const parseTemplate = (template: string): ParseTemplateResult => {
  const parts: TemplatePart[] = []
  let literal = ''
  let offset = 0

  const flushLiteral = (): void => {
    if (literal) {
      parts.push({ type: 'literal', value: literal })
      literal = ''
    }
  }

  while (offset < template.length) {
    if (template[offset] === '\\') {
      let end = offset
      while (template[end] === '\\') {
        end += 1
      }
      const slashCount = end - offset
      const delimiter = template.startsWith('${', end) ? '${' : template.startsWith('{{', end) ? '{{' : undefined

      if (delimiter) {
        literal += '\\'.repeat(Math.floor(slashCount / 2))
        if (slashCount % 2 === 1) {
          literal += delimiter
          offset = end + delimiter.length
          continue
        }
        offset = end
      } else {
        literal += '\\'.repeat(Math.ceil(slashCount / 2))
        offset = end
        continue
      }
    }

    if (template.startsWith('${', offset)) {
      const end = template.indexOf('}', offset + 2)
      if (end < 0) {
        return { ok: false }
      }
      const match = template.slice(offset + 2, end).match(variablePattern)
      if (!match) {
        return { ok: false }
      }
      flushLiteral()
      parts.push({
        type: 'variable',
        name: match[1] as string,
        ...(match[2] === undefined ? {} : { fallback: match[2] }),
      })
      offset = end + 1
      continue
    }

    if (template.startsWith('{{', offset)) {
      const end = template.indexOf('}}', offset + 2)
      if (end < 0) {
        return { ok: false }
      }
      const path = template.slice(offset + 2, end).trim()
      if (!dataPathPattern.test(path)) {
        return { ok: false }
      }
      flushLiteral()
      parts.push({ type: 'data', path })
      offset = end + 2
      continue
    }

    literal += template[offset]
    offset += 1
  }

  if (literal || parts.length === 0) {
    parts.push({ type: 'literal', value: literal })
  }
  return { ok: true, parts }
}
