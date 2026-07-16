import { builtInBooks } from '../data/books'
import type { Book } from '../types/book'
import type {
  BookProgress,
  LearningProgress,
  PatternProgress,
  PracticeMetric,
  WordProgress,
} from '../types/progress'

export const PROGRESS_KEY = 'forest-english-progress-v4'
export const BOOKS_KEY = 'forest-english-books-v1'
const LEGACY_V3_KEY = 'forest-english-progress-v3'
const LEGACY_V2_KEY = 'forest-english-progress-v2'

export function createWordProgress(): WordProgress {
  return {
    exposureCount: 0,
    listenCorrect: 0,
    listenIncorrect: 0,
    readingCorrect: 0,
    readingIncorrect: 0,
    spellingCorrect: 0,
    spellingIncorrect: 0,
    speakingAttempts: 0,
    lastPracticedAt: null,
    nextReviewAt: new Date(0).toISOString(),
    masteryLevel: 0,
    usedHintCount: 0,
  }
}

export function createPatternProgress(): PatternProgress {
  return {
    exposureCount: 0,
    comprehensionCorrect: 0,
    orderingCorrect: 0,
    fillBlankCorrect: 0,
    speakingAttempts: 0,
    readingAttempts: 0,
    lastPracticedAt: null,
    masteryLevel: 0,
  }
}

export function createProgress(): LearningProgress {
  return {
    schemaVersion: 4,
    stars: 8,
    stickers: [],
    learnedBookIds: [],
    words: {},
    patterns: {},
    books: {},
    daily: [],
    difficultWords: [],
  }
}

function mapLegacyWord(value: any): WordProgress {
  const next = createWordProgress()
  const correct = Number(value?.correctCount ?? 0)
  const incorrect = Number(value?.incorrectCount ?? 0)
  const errorTypes = value?.errorTypes ?? {}
  return {
    ...next,
    exposureCount: Number(value?.exposureCount ?? correct + incorrect),
    listenCorrect: Math.max(0, correct - Number(errorTypes.spelling ?? 0)),
    listenIncorrect: Number(errorTypes.listening ?? 0),
    readingCorrect: Math.floor(correct / 3),
    readingIncorrect: Number(errorTypes.meaning ?? 0),
    spellingCorrect: Math.floor(correct / 3),
    spellingIncorrect: Number(errorTypes.spelling ?? 0),
    lastPracticedAt: value?.lastPracticedAt ?? null,
    nextReviewAt: value?.nextReviewAt ?? new Date(0).toISOString(),
    masteryLevel: Number(value?.masteryLevel ?? 0),
  }
}

export function migrateProgress(raw: unknown): LearningProgress {
  const base = createProgress()
  if (!raw || typeof raw !== 'object') return base
  const value = raw as any
  if (value.schemaVersion === 4) {
    return {
      ...base,
      ...value,
      schemaVersion: 4,
      learnedBookIds: Array.isArray(value.learnedBookIds) ? value.learnedBookIds : [],
      difficultWords: Array.isArray(value.difficultWords) ? value.difficultWords : [],
    }
  }

  const legacyWords = Object.fromEntries(
    Object.entries(value.words ?? {}).map(([id, word]) => [id, mapLegacyWord(word)]),
  )
  const legacyWordIds = new Set(Object.keys(legacyWords))
  const learnedBookIds = builtInBooks
    .filter((book) => book.vocabulary.some((word) => legacyWordIds.has(word.id)))
    .map((book) => book.id)
  if (legacyWordIds.size && !learnedBookIds.includes('brown-bear')) learnedBookIds.unshift('brown-bear')
  const books: Record<string, BookProgress> = Object.fromEntries(
    learnedBookIds.map((bookId) => [
      bookId,
      {
          startedAt: new Date().toISOString(),
          lastOpenedAt: new Date().toISOString(),
          completedStages: [],
          currentStage: 1,
          challengeBest: 0,
      },
    ]),
  )
  return {
    ...base,
    stars: Number(value.stars) || base.stars,
    stickers: Array.isArray(value.stickers) ? value.stickers : [],
    words: legacyWords,
    learnedBookIds,
    books,
    daily: Array.isArray(value.daily) ? value.daily : [],
    difficultWords: Object.entries(legacyWords)
      .filter(([, word]) => word.listenIncorrect + word.readingIncorrect + word.spellingIncorrect > 0)
      .map(([id]) => id),
  }
}

export function loadProgress(): LearningProgress {
  try {
    const current = localStorage.getItem(PROGRESS_KEY)
    if (current) return migrateProgress(JSON.parse(current))
    const legacy = localStorage.getItem(LEGACY_V3_KEY) ?? localStorage.getItem(LEGACY_V2_KEY)
    const migrated = migrateProgress(legacy ? JSON.parse(legacy) : null)
    saveProgress(migrated)
    return migrated
  } catch {
    return createProgress()
  }
}

export function saveProgress(progress: LearningProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function migrateBooks(raw: unknown): Book[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      ...item,
      author: item.author || 'Forest English Studio',
      cover: item.cover || '📘',
      theme: item.theme || 'custom',
      level: item.level || 'starter',
      suggestedDays: Number(item.suggestedDays) || 4,
      description: item.description || '',
      pages: Array.isArray(item.pages) ? item.pages : [],
      vocabulary: Array.isArray(item.vocabulary) ? item.vocabulary : [],
      sentencePatterns: Array.isArray(item.sentencePatterns) ? item.sentencePatterns : [],
      comprehensionQuestions: Array.isArray(item.comprehensionQuestions)
        ? item.comprehensionQuestions
        : [],
      readingExtensions: Array.isArray(item.readingExtensions) ? item.readingExtensions : [],
      phonicsTargets: Array.isArray(item.phonicsTargets) ? item.phonicsTargets : [],
      exercises: Array.isArray(item.exercises) ? item.exercises : [],
      rewards: item.rewards || { stars: 10, badge: 'Book Explorer', message: 'Great work!' },
      publishingStatus: item.publishingStatus === 'published' ? 'published' : 'draft',
    }))
}

export function loadBooks(): Book[] {
  try {
    const custom = migrateBooks(JSON.parse(localStorage.getItem(BOOKS_KEY) ?? '[]'))
    const customIds = new Set(custom.map((book) => book.id))
    return [...builtInBooks.filter((book) => !customIds.has(book.id)), ...custom]
  } catch {
    return builtInBooks
  }
}

export function saveBooks(books: Book[]): void {
  const customOrEdited = books.filter((book) => {
    const builtIn = builtInBooks.find((item) => item.id === book.id)
    return !builtIn || JSON.stringify(builtIn) !== JSON.stringify(book)
  })
  localStorage.setItem(BOOKS_KEY, JSON.stringify(customOrEdited))
}

export function markBookStarted(progress: LearningProgress, bookId: string): LearningProgress {
  const now = new Date().toISOString()
  const existing = progress.books[bookId]
  return {
    ...progress,
    learnedBookIds: [...new Set([...progress.learnedBookIds, bookId])],
    books: {
      ...progress.books,
      [bookId]: existing
        ? { ...existing, lastOpenedAt: now }
        : {
            startedAt: now,
            lastOpenedAt: now,
            completedStages: [],
            currentStage: 1,
            challengeBest: 0,
          },
    },
  }
}

export function completeBookStage(
  progress: LearningProgress,
  bookId: string,
  stage: number,
): LearningProgress {
  const started = markBookStarted(progress, bookId)
  const book = started.books[bookId]
  return {
    ...started,
    books: {
      ...started.books,
      [bookId]: {
        ...book,
        currentStage: Math.min(6, stage + 1),
        completedStages: [...new Set([...book.completedStages, stage])],
      },
    },
  }
}

export function recordWordPractice(
  progress: LearningProgress,
  wordId: string,
  metric: PracticeMetric,
  correct = true,
  usedHint = false,
): LearningProgress {
  const current = progress.words[wordId] ?? createWordProgress()
  const now = new Date()
  const next = { ...current }
  next.exposureCount += 1
  next.lastPracticedAt = now.toISOString()
  if (usedHint) next.usedHintCount += 1
  if (metric === 'listening') {
    if (correct) next.listenCorrect += 1
    else next.listenIncorrect += 1
  }
  if (metric === 'reading') {
    if (correct) next.readingCorrect += 1
    else next.readingIncorrect += 1
  }
  if (metric === 'spelling') {
    if (correct) next.spellingCorrect += 1
    else next.spellingIncorrect += 1
  }
  if (metric === 'speaking') next.speakingAttempts += 1
  const totalCorrect = next.listenCorrect + next.readingCorrect + next.spellingCorrect
  const totalIncorrect = next.listenIncorrect + next.readingIncorrect + next.spellingIncorrect
  next.masteryLevel = Math.max(
    0,
    Math.min(5, Math.floor((totalCorrect - totalIncorrect * 0.6) / 3)),
  )
  const intervals = [0, 1, 2, 4, 7, 14]
  const delay = correct ? intervals[next.masteryLevel] : 0
  next.nextReviewAt = new Date(now.getTime() + delay * 86_400_000).toISOString()
  const difficult = totalIncorrect > totalCorrect / 2
  const difficultWords = difficult
    ? [...new Set([...progress.difficultWords, wordId])]
    : progress.difficultWords.filter((id) => id !== wordId)
  const date = now.toISOString().slice(0, 10)
  const today = progress.daily.find((item) => item.date === date) ?? {
    date,
    seconds: 0,
    questions: 0,
    reviewed: [],
  }
  const daily = [
    ...progress.daily.filter((item) => item.date !== date),
    {
      ...today,
      seconds: today.seconds + 25,
      questions: today.questions + 1,
      reviewed: [...new Set([...today.reviewed, wordId])],
    },
  ]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-30)
  return {
    ...progress,
    stars: progress.stars + (correct ? 1 : 0),
    words: { ...progress.words, [wordId]: next },
    difficultWords,
    daily,
  }
}

export function recordPatternPractice(
  progress: LearningProgress,
  patternId: string,
  metric: PracticeMetric,
  correct = true,
): LearningProgress {
  const current = progress.patterns[patternId] ?? createPatternProgress()
  const next = { ...current }
  next.exposureCount += 1
  next.lastPracticedAt = new Date().toISOString()
  if (metric === 'comprehension' && correct) next.comprehensionCorrect += 1
  if (metric === 'ordering' && correct) next.orderingCorrect += 1
  if (metric === 'fill-blank' && correct) next.fillBlankCorrect += 1
  if (metric === 'speaking') next.speakingAttempts += 1
  if (metric === 'reading') next.readingAttempts += 1
  const successes =
    next.comprehensionCorrect +
    next.orderingCorrect +
    next.fillBlankCorrect +
    next.readingAttempts
  next.masteryLevel = Math.max(0, Math.min(5, Math.floor(successes / 3)))
  return {
    ...progress,
    patterns: {
      ...progress.patterns,
      [patternId]: next,
    },
  }
}
