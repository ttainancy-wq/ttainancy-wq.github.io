import { describe, expect, it } from 'vitest'
import { builtInBooks } from '../data/books'
import { generateSentences } from './sentenceGenerator'

describe('SentenceGenerator', () => {
  it('uses only the Brown Bear see pattern without injecting harder grammar', () => {
    const book = builtInBooks.find((item) => item.id === 'brown-bear')!
    const sentences = generateSentences(book.id, book.sentencePatterns[0], 30)
    const text = sentences.map((sentence) => sentence.text)

    expect(text).toContain('I see a brown bear.')
    expect(text).toContain('I see a red bird.')
    expect(text).toContain('I see a yellow duck.')
    expect(text).toContain('I see a green frog.')
    expect(text).toContain('What do you see?')
    expect(text).toContain('Do you see a yellow duck?')
    expect(text.join(' ')).not.toMatch(/\b(near|behind|beside|can|two)\b/i)
    expect(text).not.toContain('I see a brown bird.')

    sentences.forEach((sentence) => {
      expect(sentence.sourceBookId).toBe(book.id)
      expect(sentence.sourcePatternId).toBe('bb-see')
      expect(sentence.expectedAnswers.length).toBeGreaterThan(0)
      expect(sentence.text).not.toMatch(/\{.+\}/)
      expect(sentence.text).not.toMatch(/\ba [aeiou]/i)
    })
  })

  it('keeps Rain and Thunder variants inside their own configured book language', () => {
    const rainBook = builtInBooks.find((book) => book.id === 'rain-rain-go-away')!
    const rainText = rainBook.sentencePatterns
      .flatMap((pattern) => generateSentences(rainBook.id, pattern, 20))
      .map((sentence) => sentence.text)
      .join(' ')
    expect(rainText).toContain('Rain, rain, go away.')
    expect(rainText).toContain('Come again another day.')
    expect(rainText).not.toMatch(/\b(near|behind|beside)\b/i)

    const thunderBook = builtInBooks.find((book) => book.id === 'there-is-thunder')!
    const thunderText = thunderBook.sentencePatterns
      .flatMap((pattern) => generateSentences(thunderBook.id, pattern, 20))
      .map((sentence) => sentence.text)
    expect(thunderText).toContain('I hear thunder.')
    expect(thunderText).toContain('I see lightning.')
  })
})
