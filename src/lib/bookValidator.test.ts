import { describe, expect, it } from 'vitest'
import { builtInBooks, cloneBookTemplate } from '../data/books'
import { validateBook } from './bookValidator'

describe('book data model and validation', () => {
  it('ships three independently configured, publishable books', () => {
    expect(builtInBooks.map((book) => book.id)).toEqual([
      'brown-bear',
      'rain-rain-go-away',
      'there-is-thunder',
    ])
    builtInBooks.forEach((book) => {
      const result = validateBook(book)
      expect(result.errors, `${book.title}: ${result.errors.join(', ')}`).toEqual([])
      expect(result.valid).toBe(true)
      expect(book.pages.length).toBeGreaterThanOrEqual(4)
      expect(book.vocabulary.filter((word) => word.isCore).length).toBeGreaterThanOrEqual(6)
      expect(book.sentencePatterns.length).toBeGreaterThanOrEqual(1)
    })
    const brownBear = builtInBooks[0]
    expect(brownBear.sentencePatterns).toHaveLength(1)
    const brownBearPracticeText = JSON.stringify({
      pages: brownBear.pages,
      patterns: brownBear.sentencePatterns,
      reading: brownBear.readingExtensions,
    })
    expect(brownBearPracticeText).not.toMatch(/\b(near|behind|beside|can)\b/i)
  })

  it('provides a complete reusable draft template', () => {
    const template = cloneBookTemplate()
    expect(template.publishingStatus).toBe('draft')
    expect(validateBook(template).valid).toBe(true)
    template.title = ''
    expect(validateBook(template).errors).toContain('title 不能为空')
  })

  it('catches broken word and pattern references before publishing', () => {
    const book = structuredClone(builtInBooks[0])
    book.pages[0].focusWords = ['missing-word']
    book.pages[0].focusPattern = 'missing-pattern'
    const result = validateBook(book)
    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('missing-word'))).toBe(true)
    expect(result.errors.some((error) => error.includes('missing-pattern'))).toBe(true)
  })
})
