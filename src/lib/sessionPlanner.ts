import type { Book, VocabularyItem } from '../types/book'
import type { LearningProgress } from '../types/progress'
import { generateSentences } from './sentenceGenerator'

export type TrainingFormat = 'word' | 'phrase' | 'sentence'
export type TrainingMode = 'listening' | 'reading' | 'phonics' | 'words' | 'mixed'

export interface PlannedQuestion {
  id: string
  mode: TrainingMode
  format: TrainingFormat
  sourceBookId: string
  answerId: string
  answerText: string
  category: string
  prompt: string
  sentence?: string
  choices: string[]
  correctPosition: number
  focusWordIds: string[]
  reviewWordIds: string[]
}

export interface DistributionReport {
  wordCounts: Record<string, number>
  bookCounts: Record<string, number>
  categoryCounts: Record<string, number>
  answerPositionCounts: Record<string, number>
  violations: string[]
}

export interface SessionPlan {
  seed: number
  questions: PlannedQuestion[]
  report: DistributionReport
}

interface Candidate {
  book: Book
  word: VocabularyItem
  format: TrainingFormat
  prompt: string
  answerText: string
  sentence?: string
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1))
    ;[copy[index], copy[next]] = [copy[next], copy[index]]
  }
  return copy
}

function learnedPublishedBooks(books: Book[], progress: LearningProgress): Book[] {
  return books.filter(
    (book) => book.publishingStatus === 'published' && progress.learnedBookIds.includes(book.id),
  )
}

function candidatesForBook(book: Book): Candidate[] {
  const core = book.vocabulary.filter((word) => word.isCore)
  const generated = book.sentencePatterns.flatMap((pattern) => generateSentences(book.id, pattern, 8))

  return core.flatMap((word, index) => {
    const sentence =
      generated.find((item) => item.targetWords.includes(word.word))?.text ??
      word.exampleSentences[0] ??
      `This word is ${word.word}.`
    const phrase = sentence
      .replace(/[.!?]/g, '')
      .split(' ')
      .filter((token) => token.toLowerCase().includes(word.word.toLowerCase()) || token.length < 8)
      .slice(0, 4)
      .join(' ')
    return [
      {
        book,
        word,
        format: 'word' as const,
        prompt: word.word,
        answerText: word.word,
      },
      {
        book,
        word,
        format: 'phrase' as const,
        prompt: phrase || `${word.word} ${core[(index + 1) % core.length]?.word ?? ''}`.trim(),
        answerText: word.word,
        sentence,
      },
      {
        book,
        word,
        format: 'sentence' as const,
        prompt: sentence,
        answerText: word.word,
        sentence,
      },
    ]
  })
}

function masteryScore(progress: LearningProgress, wordId: string): number {
  const item = progress.words[wordId]
  if (!item) return 100
  const errors = item.listenIncorrect + item.readingIncorrect + item.spellingIncorrect
  return errors * 22 + Math.max(0, 6 - item.masteryLevel) * 5 - item.exposureCount
}

function buildChoices(
  candidate: Candidate,
  allWords: VocabularyItem[],
  correctPosition: number,
  random: () => number,
): string[] {
  const distractorIds = new Set(candidate.word.distractors.map((word) => word.toLowerCase()))
  const preferred = allWords.filter(
    (word) =>
      word.id !== candidate.word.id &&
      (word.category === candidate.word.category || distractorIds.has(word.word.toLowerCase())),
  )
  const fallback = allWords.filter((word) => word.id !== candidate.word.id)
  const distractors = shuffle([...preferred, ...fallback], random)
    .filter((word, index, source) => source.findIndex((item) => item.id === word.id) === index)
    .slice(0, 3)
    .map((word) => word.id)
  while (distractors.length < 3) distractors.push(`choice-${distractors.length + 1}`)
  distractors.splice(correctPosition, 0, candidate.word.id)
  return distractors.slice(0, 4)
}

function chooseCandidate(
  pool: Candidate[],
  questions: PlannedQuestion[],
  wordCounts: Record<string, number>,
  bookCounts: Record<string, number>,
  format: TrainingFormat,
  random: () => number,
  progress: LearningProgress,
): Candidate | undefined {
  const lastFive = new Set(questions.slice(-5).map((question) => question.answerId))
  const lastTwoCategories = questions.slice(-2).map((question) => question.category)

  const eligible = pool.filter((candidate) => {
    if (candidate.format !== format) return false
    if ((wordCounts[candidate.word.id] ?? 0) >= 2) return false
    if (lastFive.has(candidate.word.id)) return false
    if (
      lastTwoCategories.length === 2 &&
      lastTwoCategories.every((category) => category === candidate.word.category)
    ) {
      return false
    }
    return true
  })

  const bookMinimum = eligible.length
    ? Math.min(...eligible.map((candidate) => bookCounts[candidate.book.id] ?? 0))
    : 0
  const balanced = eligible.filter(
    (candidate) => (bookCounts[candidate.book.id] ?? 0) <= bookMinimum + 1,
  )
  const ranked = shuffle(balanced.length ? balanced : eligible, random).sort(
    (left, right) =>
      masteryScore(progress, right.word.id) - masteryScore(progress, left.word.id),
  )
  return ranked[0]
}

function reportFor(questions: PlannedQuestion[]): DistributionReport {
  const report: DistributionReport = {
    wordCounts: {},
    bookCounts: {},
    categoryCounts: {},
    answerPositionCounts: {},
    violations: [],
  }
  questions.forEach((question, index) => {
    report.wordCounts[question.answerId] = (report.wordCounts[question.answerId] ?? 0) + 1
    report.bookCounts[question.sourceBookId] = (report.bookCounts[question.sourceBookId] ?? 0) + 1
    report.categoryCounts[question.category] = (report.categoryCounts[question.category] ?? 0) + 1
    report.answerPositionCounts[String(question.correctPosition)] =
      (report.answerPositionCounts[String(question.correctPosition)] ?? 0) + 1
    if (questions.slice(Math.max(0, index - 5), index).some((item) => item.answerId === question.answerId)) {
      report.violations.push(`Q${index + 1}: correct answer repeated inside five-question window`)
    }
    if (report.wordCounts[question.answerId] > 2) {
      report.violations.push(`Q${index + 1}: ${question.answerId} appeared more than twice`)
    }
    if (
      index >= 2 &&
      questions[index - 1].category === question.category &&
      questions[index - 2].category === question.category
    ) {
      report.violations.push(`Q${index + 1}: category repeated more than twice`)
    }
    if (index > 0 && questions[index - 1].correctPosition === question.correctPosition) {
      report.violations.push(`Q${index + 1}: answer position repeated`)
    }
  })
  return report
}

export function planSession(
  books: Book[],
  progress: LearningProgress,
  mode: TrainingMode,
  length = 12,
  seed = Date.now(),
): SessionPlan {
  const activeBooks = learnedPublishedBooks(books, progress)
  if (!activeBooks.length) return { seed, questions: [], report: reportFor([]) }
  const random = mulberry32(seed)
  const pool = activeBooks.flatMap(candidatesForBook)
  const allWords = activeBooks.flatMap((book) => book.vocabulary)
  const wordCounts: Record<string, number> = {}
  const bookCounts: Record<string, number> = {}
  const questions: PlannedQuestion[] = []
  const formats: TrainingFormat[] = ['word', 'phrase', 'sentence']
  let previousPosition = -1

  for (let index = 0; index < length; index += 1) {
    const requestedFormat = formats[index % formats.length]
    let candidate = chooseCandidate(
      pool,
      questions,
      wordCounts,
      bookCounts,
      requestedFormat,
      random,
      progress,
    )
    if (!candidate) {
      candidate = chooseCandidate(
        pool,
        questions.slice(-4),
        wordCounts,
        bookCounts,
        requestedFormat,
        random,
        progress,
      )
    }
    if (!candidate) break

    let position = Math.floor(random() * 4)
    if (position === previousPosition) position = (position + 1 + Math.floor(random() * 3)) % 4
    previousPosition = position
    wordCounts[candidate.word.id] = (wordCounts[candidate.word.id] ?? 0) + 1
    bookCounts[candidate.book.id] = (bookCounts[candidate.book.id] ?? 0) + 1

    const difficultIds = progress.difficultWords.filter((id) => id !== candidate.word.id)
    const reviewWordIds =
      index >= 2 && index <= 4
        ? difficultIds.filter((id) => questions[0]?.focusWordIds.includes(id)).slice(0, 1)
        : []

    questions.push({
      id: `${mode}-${index + 1}-${candidate.book.id}-${candidate.word.id}-${candidate.format}`,
      mode,
      format: candidate.format,
      sourceBookId: candidate.book.id,
      answerId: candidate.word.id,
      answerText: candidate.answerText,
      category: candidate.word.category,
      prompt: candidate.prompt,
      sentence: candidate.sentence,
      choices: buildChoices(candidate, allWords, position, random),
      correctPosition: position,
      focusWordIds: [candidate.word.id],
      reviewWordIds,
    })
  }

  return { seed, questions, report: reportFor(questions) }
}

export function createDistributionReport(questions: PlannedQuestion[]): DistributionReport {
  return reportFor(questions)
}
