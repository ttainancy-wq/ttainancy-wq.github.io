import type { Book } from '../../types/book'
import brownBear from './brown-bear.json'
import rainRainGoAway from './rain-rain-go-away.json'
import thereIsThunder from './there-is-thunder.json'
import bookTemplate from './book-template.json'

export const builtInBooks = [brownBear, rainRainGoAway, thereIsThunder] as unknown as Book[]
export const emptyBookTemplate = bookTemplate as unknown as Book

export function cloneBookTemplate(): Book {
  return structuredClone(emptyBookTemplate)
}
