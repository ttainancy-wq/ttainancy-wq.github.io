import type { Book } from '../types/book'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const requiredText = (value: unknown) => typeof value === 'string' && value.trim().length > 0
const unique = (values: string[]) => new Set(values).size === values.length

export function validateBook(book: Partial<Book>): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  ;(['id', 'title', 'author', 'cover', 'theme', 'description'] as const).forEach((key) => {
    if (!requiredText(book[key])) errors.push(`${key} 不能为空`)
  })

  if (!book.level) errors.push('level 不能为空')
  if (!Number.isFinite(book.suggestedDays) || Number(book.suggestedDays) < 1) {
    errors.push('suggestedDays 必须大于 0')
  }
  if (!book.publishingStatus) errors.push('publishingStatus 不能为空')
  if (!book.pages?.length) errors.push('至少需要 1 个绘本页面')
  if (!book.vocabulary?.length) errors.push('至少需要 1 个单词')
  if (!book.sentencePatterns?.length) errors.push('至少需要 1 个句型')
  if (!book.comprehensionQuestions?.length) warnings.push('建议至少添加 1 个理解问题')
  if (!book.readingExtensions?.length) warnings.push('建议至少添加 1 个阅读扩展')
  if (!book.phonicsTargets?.length) warnings.push('建议添加拼读目标')

  const pageIds = book.pages?.map((page) => page.id) ?? []
  const wordIds = book.vocabulary?.map((word) => word.id) ?? []
  const patternIds = book.sentencePatterns?.map((pattern) => pattern.id) ?? []
  if (!unique(pageIds)) errors.push('页面 id 必须唯一')
  if (!unique(wordIds)) errors.push('单词 id 必须唯一')
  if (!unique(patternIds)) errors.push('句型 id 必须唯一')

  book.pages?.forEach((page, index) => {
    if (!requiredText(page.id)) errors.push(`第 ${index + 1} 页缺少 id`)
    if (!requiredText(page.image)) errors.push(`第 ${index + 1} 页缺少原创场景或占位图`)
    if (!requiredText(page.text)) errors.push(`第 ${index + 1} 页缺少正文`)
    if (!page.focusWords?.length) warnings.push(`第 ${index + 1} 页没有重点单词`)
    page.focusWords?.forEach((id) => {
      if (!wordIds.includes(id)) errors.push(`第 ${index + 1} 页引用了不存在的单词 ${id}`)
    })
    if (page.focusPattern && !patternIds.includes(page.focusPattern)) {
      errors.push(`第 ${index + 1} 页引用了不存在的句型 ${page.focusPattern}`)
    }
  })

  book.vocabulary?.forEach((word, index) => {
    const requiredKeys = [
      'id',
      'word',
      'meaning',
      'category',
      'image',
      'audio',
      'phonics',
    ] as const
    requiredKeys.forEach((key) => {
      if (typeof word[key] !== 'string') errors.push(`第 ${index + 1} 个单词缺少 ${key}`)
    })
    if (!word.syllables?.length) errors.push(`${word.word || `第 ${index + 1} 个单词`} 缺少音节`)
    if (!word.exampleSentences?.length) errors.push(`${word.word || `第 ${index + 1} 个单词`} 缺少例句`)
    if (!word.distractors?.length) warnings.push(`${word.word || `第 ${index + 1} 个单词`} 缺少干扰项`)
  })

  book.sentencePatterns?.forEach((pattern, index) => {
    if (!requiredText(pattern.pattern)) errors.push(`第 ${index + 1} 个句型缺少模板`)
    pattern.slots?.forEach((slot) => {
      if (!pattern.replacements?.[slot]?.length) errors.push(`${pattern.id} 的词槽 ${slot} 没有替换词`)
      if (!pattern.pattern.includes(`{${slot}}`)) warnings.push(`${pattern.id} 的模板未使用词槽 ${slot}`)
    })
  })

  return { valid: errors.length === 0, errors, warnings }
}
