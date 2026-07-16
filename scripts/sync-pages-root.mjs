import { cp, mkdir, rm } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const dist = new URL('../dist/', import.meta.url)
const rootAssets = new URL('../assets/', import.meta.url)

await rm(rootAssets, { recursive: true, force: true })
await mkdir(rootAssets, { recursive: true })
await cp(new URL('assets/', dist), rootAssets, { recursive: true })
await cp(new URL('index.html', dist), new URL('index.html', root))
await cp(new URL('index.html', dist), new URL('404.html', root))
