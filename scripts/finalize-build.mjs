import { access, rename } from 'node:fs/promises'

const source = new URL('../dist/index.source.html', import.meta.url)
const target = new URL('../dist/index.html', import.meta.url)

await access(source)
await rename(source, target)
