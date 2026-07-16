export interface WordProgress {
  exposureCount: number
  listenCorrect: number
  listenIncorrect: number
  readingCorrect: number
  readingIncorrect: number
  spellingCorrect: number
  spellingIncorrect: number
  speakingAttempts: number
  lastPracticedAt: string | null
  nextReviewAt: string
  masteryLevel: number
  usedHintCount: number
}

export interface PatternProgress {
  exposureCount: number
  comprehensionCorrect: number
  orderingCorrect: number
  fillBlankCorrect: number
  speakingAttempts: number
  readingAttempts: number
  lastPracticedAt: string | null
  masteryLevel: number
}

export interface BookProgress {
  startedAt: string
  lastOpenedAt: string
  completedStages: number[]
  currentStage: number
  challengeBest: number
}

export interface DailyProgress {
  date: string
  seconds: number
  questions: number
  reviewed: string[]
}

export interface LearningProgress {
  schemaVersion: 4
  stars: number
  stickers: string[]
  learnedBookIds: string[]
  words: Record<string, WordProgress>
  patterns: Record<string, PatternProgress>
  books: Record<string, BookProgress>
  daily: DailyProgress[]
  difficultWords: string[]
  lastSession?: {
    kind: string
    index: number
  }
}

export type PracticeMetric =
  | 'listening'
  | 'reading'
  | 'spelling'
  | 'speaking'
  | 'comprehension'
  | 'ordering'
  | 'fill-blank'

export interface RecordingMeta {
  id: string
  bookId?: string
  pageId?: string
  wordId?: string
  sentence: string
  createdAt: string
  durationMs: number
  isBest: boolean
}
