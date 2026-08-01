const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const idLength = 12

export const createId = (): string => {
  const { crypto } = globalThis
  const randomValues = crypto?.getRandomValues ? crypto.getRandomValues(new Uint32Array(idLength)) : undefined

  return Array.from(
    { length: idLength },
    (_, index) => alphabet[Math.floor(((randomValues?.[index] ?? Math.random() * 2 ** 32) / 2 ** 32) * alphabet.length)]
  ).join('')
}
