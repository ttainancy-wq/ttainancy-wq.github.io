import { describe, expect, it } from 'vitest'
import { builtInBooks } from '../data/books'
import { createProgress, createWordProgress } from './storage'
import { planSession } from './sessionPlanner'

function learnedProgress() {
  const progress = createProgress()
  progress.learnedBookIds = builtInBooks.map((book) => book.id)
  progress.difficultWords = ['rainy']
  progress.words.rainy = {
    ...createWordProgress(),
    exposureCount: 8,
    listenIncorrect: 5,
    masteryLevel: 0,
  }
  progress.words.bear = {
    ...createWordProgress(),
    exposureCount: 20,
    listenCorrect: 18,
    readingCorrect: 12,
    spellingCorrect: 9,
    masteryLevel: 5,
  }
  return progress
}

describe('SessionPlanner and QuestionEngine', () => {
  it('creates the complete plan before the session and obeys repeat constraints', () => {
    const plan = planSession(builtInBooks, learnedProgress(), 'mixed', 15, 20260716)
    expect(plan.questions).toHaveLength(15)
    expect(plan.report.violations).toEqual([])

    plan.questions.forEach((question, index) => {
      expect(plan.questions.slice(Math.max(0, index - 5), index).map((item) => item.answerId)).not.toContain(question.answerId)
      if (index > 0) expect(question.correctPosition).not.toBe(plan.questions[index - 1].correctPosition)
      if (index > 1) {
        expect([
          plan.questions[index - 2].category,
          plan.questions[index - 1].category,
          question.category,
        ].every((category) => category === question.category)).toBe(false)
      }
      expect(question.format).toBe(['word', 'phrase', 'sentence'][index % 3])
    })

    expect(Math.max(...Object.values(plan.report.wordCounts))).toBeLessThanOrEqual(2)
    expect(plan.report.wordCounts.rainy ?? 0).toBeLessThanOrEqual(2)
    const bookCounts = Object.values(plan.report.bookCounts)
    expect(Math.max(...bookCounts) - Math.min(...bookCounts)).toBeLessThanOrEqual(2)
  })

  it('prioritizes weak content, but can surface it as spaced review without repeating the correct answer', () => {
    const plan = planSession(builtInBooks, learnedProgress(), 'listening', 12, 18)
    expect(plan.questions[0].answerId).toBe('rainy')
    expect(plan.questions.slice(2, 5).some((question) => question.reviewWordIds.includes('rainy'))).toBe(true)
    expect(plan.questions.slice(1, 6).some((question) => question.answerId === 'rainy')).toBe(false)
  })

  it('only reads published books that the child has learned', () => {
    const progress = createProgress()
    progress.learnedBookIds = ['brown-bear']
    const plan = planSession(builtInBooks, progress, 'reading', 9, 9)
    expect(new Set(plan.questions.map((question) => question.sourceBookId))).toEqual(new Set(['brown-bear']))
  })
})
