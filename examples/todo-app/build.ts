import Bun, { type BuildOutput } from 'bun'
import { FileMoverPlugin } from 'bun-file-mover-plugin'

export const build = async (): Promise<BuildOutput> => {
  const result = await Bun.build({
    entrypoints: ['./src/app.ts'],
    outdir: './build',
    target: 'browser',
    format: 'esm',
    splitting: true,
    minify: false,
    publicPath: '/',
    sourcemap: 'external',
    plugins: [
      FileMoverPlugin({
        from: './src/public',
        to: './build',
      }),
    ],
  })

  if (!result.success) {
    throw new Error('Todo app build failed')
  }

  return result
}

if (import.meta.main) {
  await build()
}
