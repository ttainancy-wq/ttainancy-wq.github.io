import { describe, expect, it } from 'vitest'
import { builtInBooks } from '../data/books'
import { generateSentences } from './sentenceGenerator'

describe('SentenceGenerator', () => {
  it('generates traceable singular, plural, question, answer, location and action forms', () => {
    const book = builtInBooks[0]
    const sentences = generateSentences(book.id, book.sentencePatterns[0], 18)
    const kinds = new Set(sentences.map((sentence) => sentence.kind))
    expect(kinds.has('statement')).toBe(true)
    expect(kinds.has('plural')).toBe(true)
    expect(kinds.has('yes-no-question')).toBe(true)
    expect(kinds.has('wh-question')).toBe(true)
    expect(kinds.has('short-answer')).toBe(true)
    expect(kinds.has('full-answer')).toBe(true)
    expect(kinds.has('location')).toBe(true)
    expect(kinds.has('action')).toBe(true)
    sentences.forEach((sentence) => {
      expect(sentence.sourceBookId).toBe(book.id)
      expect(sentence.sourcePatternId).toBe(book.sentencePatterns[0].id)
      expect(sentence.difficulty).toBeGreaterThanOrEqual(1)
      expect(sentence.expectedAnswers.length).toBeGreaterThan(0)
      expect(sentence.text).not.toMatch(/\{.+\}/)
      expect(sentence.text).not.toMatch(/\ba [aeiou]/i)
    })
  })

  it('does not inject animal grammar into weather-only patterns', () => {
    const rainBook = builtInBooks.find((book) => book.id === 'rain-rain-go-away')!
    const sentences = generateSentences(rainBook.id, rainBook.sentencePatterns[0], 16)
    expect(sentences.some((sentence) => sentence.text.includes('animal'))).toBe(false)
    expect(sentences.some((sentence) => sentence.text === 'It is a rainy day.')).toBe(true)
    expect(sentences.some((sentence) => sentence.text === 'What is the weather like?')).toBe(true)
  })
})
