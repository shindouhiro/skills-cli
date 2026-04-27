import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      cli: 'src/cli.ts',
      index: 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: { entry: 'src/index.ts' },
    clean: true,
    shims: true,
    platform: 'node',
    target: 'node18',
    alias: {
      '~': './src',
    },
  },
])
