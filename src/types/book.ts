export type PublishingStatus = 'draft' | 'published'
export type BookLevel = 'starter' | 'level-1' | 'level-2' | 'level-3'
export type QuestionKind =
  | 'picture'
  | 'yes-no'
  | 'word'
  | 'short-answer'
  | 'sequence'
  | 'who'
  | 'what'
  | 'where'
  | 'recording'

export interface BookPageQuestion {
  id: string
  prompt: string
  type: QuestionKind
  answers: string[]
  choices?: string[]
}

export interface BookPage {
  id: string
  image: string
  text: string
  optionalTranslation?: string
  audio: string
  focusWords: string[]
  focusPattern: string
  questions: BookPageQuestion[]
}

export interface VocabularyItem {
  id: string
  word: string
  meaning: string
  category: string
  image: string
  audio: string
  phonics: string
  syllables: string[]
  exampleSentences: string[]
  distractors: string[]
  isCore: boolean
}

export interface SentencePattern {
  id: string
  pattern: string
  slots: string[]
  replacements: Record<string, string[]>
  questionForms: string[]
  answerForms: string[]
  levels: string[]
  examples: string[]
}

export interface ComprehensionQuestion {
  id: string
  type: QuestionKind
  prompt: string
  answers: string[]
  choices?: string[]
  pageId?: string
}

export interface ReadingExtension {
  id: string
  title: string
  sentences: string[]
  questions: ComprehensionQuestion[]
}

export interface BookExercise {
  id: string
  type: string
  title: string
  targetIds: string[]
}

export interface BookRewards {
  stars: number
  badge: string
  message: string
}

export interface Book {
  id: string
  title: string
  author: string
  cover: string
  theme: string
  level: BookLevel
  suggestedDays: number
  description: string
  pages: BookPage[]
  vocabulary: VocabularyItem[]
  sentencePatterns: SentencePattern[]
  comprehensionQuestions: ComprehensionQuestion[]
  readingExtensions: ReadingExtension[]
  phonicsTargets: string[]
  exercises: BookExercise[]
  rewards: BookRewards
  publishingStatus: PublishingStatus
}

export interface GeneratedSentence {
  id: string
  text: string
  kind:
    | 'statement'
    | 'plural'
    | 'yes-no-question'
    | 'wh-question'
    | 'short-answer'
    | 'full-answer'
    | 'location'
    | 'action'
  sourceBookId: string
  sourcePatternId: string
  difficulty: number
  targetWords: string[]
  expectedAnswers: string[]
}
