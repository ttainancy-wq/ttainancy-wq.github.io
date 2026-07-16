import { beforeEach, describe, expect, it } from 'vitest'
import { builtInBooks } from '../data/books'
import {
  BOOKS_KEY,
  PROGRESS_KEY,
  createProgress,
  loadBooks,
  loadProgress,
  markBookStarted,
  migrateProgress,
  recordWordPractice,
  saveBooks,
  saveProgress,
} from './storage'

describe('local persistence and migration', () => {
  beforeEach(() => localStorage.clear())

  it('migrates legacy Brown Bear and rainy records without clearing progress', () => {
    const legacy = {
      version: 3,
      stars: 23,
      stickers: ['超级耳朵'],
      words: {
        bear: { exposureCount: 5, correctCount: 4, incorrectCount: 1, masteryLevel: 3, errorTypes: { meaning: 1 } },
        rainy: { exposureCount: 9, correctCount: 3, incorrectCount: 6, masteryLevel: 1, errorTypes: { listening: 6 } },
      },
      daily: [{ date: '2026-07-16', seconds: 120, questions: 8, reviewed: ['bear', 'rainy'] }],
    }
    const migrated = migrateProgress(legacy)
    expect(migrated.schemaVersion).toBe(4)
    expect(migrated.stars).toBe(23)
    expect(migrated.words.bear.exposureCount).toBe(5)
    expect(migrated.words.rainy.listenIncorrect).toBe(6)
    expect(migrated.learnedBookIds).toContain('brown-bear')
    expect(migrated.learnedBookIds).toContain('rain-rain-go-away')
  })

  it('persists books and progress after a refresh-style reload', () => {
    const books = structuredClone(builtInBooks)
    books[0].title = 'Brown Bear Updated'
    saveBooks(books)
    expect(localStorage.getItem(BOOKS_KEY)).toContain('Brown Bear Updated')
    expect(loadBooks().find((book) => book.id === 'brown-bear')?.title).toBe('Brown Bear Updated')

    let progress = markBookStarted(createProgress(), 'brown-bear')
    progress = recordWordPractice(progress, 'bear', 'listening', false)
    saveProgress(progress)
    expect(localStorage.getItem(PROGRESS_KEY)).toContain('brown-bear')
    const reloaded = loadProgress()
    expect(reloaded.books['brown-bear']).toBeDefined()
    expect(reloaded.words.bear.listenIncorrect).toBe(1)
  })
})
