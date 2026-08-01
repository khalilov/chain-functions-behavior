import Bun, { type BuildOutput } from 'bun'
import { FileMoverPlugin } from 'bun-file-mover-plugin'

const sourceDirectory = `${import.meta.dir}/src`
const outputDirectory = `${import.meta.dir}/dist`

export const build = async (): Promise<BuildOutput> => {
  const result = await Bun.build({
    entrypoints: [`${sourceDirectory}/app.ts`],
    outdir: outputDirectory,
    target: 'browser',
    format: 'esm',
    splitting: true,
    minify: false,
    publicPath: '/',
    sourcemap: 'external',
    plugins: [
      FileMoverPlugin({
        from: `${sourceDirectory}/public`,
        to: outputDirectory,
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
