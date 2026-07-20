import type { GeneratedSentence, SentencePattern } from '../types/book'

function fill(template: string, values: Record<string, string>): string {
  return template
    .replace(/\{(\w+)\}/g, (_, slot: string) => values[slot] ?? slot)
    .replace(/\ba ([aeiou]\w*)/gi, 'an $1')
    .replace(/\s+/g, ' ')
    .trim()
}

function valuesFor(pattern: SentencePattern, variant: number): Record<string, string> {
  return Object.fromEntries(
    pattern.slots.map((slot) => {
      const choices = pattern.replacements[slot] ?? [slot]
      return [slot, choices[variant % choices.length]]
    }),
  )
}

function add(
  results: GeneratedSentence[],
  sentence: Omit<GeneratedSentence, 'id'>,
): void {
  if (!sentence.text || results.some((item) => item.text === sentence.text && item.kind === sentence.kind)) return
  results.push({ ...sentence, id: `${sentence.sourcePatternId}-${results.length + 1}` })
}

/**
 * Generate practice variants only from the pattern's own configured material.
 * Nothing is injected here: no locations, actions, plurals, or vocabulary that
 * the child has not already met in the book JSON.
 */
export function generateSentences(
  sourceBookId: string,
  pattern: SentencePattern,
  maxVariants = 18,
): GeneratedSentence[] {
  const results: GeneratedSentence[] = []
  const replacementCount = Math.max(
    1,
    ...pattern.slots.map((slot) => pattern.replacements[slot]?.length ?? 1),
  )
  const rounds = Math.min(6, replacementCount)

  const variants = Array.from({ length: rounds }, (_, variant) => {
    const values = valuesFor(pattern, variant)
    return {
      values,
      base: {
        sourceBookId,
        sourcePatternId: pattern.id,
        targetWords: [...new Set(Object.values(values).flatMap((value) => value.split(/\s+/)))],
      },
    }
  })

  // Simple statements from every replacement set come first, so a short
  // practice list still covers every configured color, animal, or story word.
  variants.forEach(({ values, base }) => {
    const statement = fill(pattern.pattern, values)

    add(results, {
      ...base,
      text: statement,
      kind: 'statement',
      difficulty: 1,
      expectedAnswers: [statement],
    })

    pattern.levels.forEach((level, levelIndex) => {
      const text = fill(level, values)
      add(results, {
        ...base,
        text,
        kind: 'statement',
        difficulty: Math.min(3, levelIndex + 1),
        expectedAnswers: [text],
      })
    })
  })

  variants.forEach(({ values, base }) => {
    pattern.questionForms.forEach((question) => {
      const text = fill(question, values)
      add(results, {
        ...base,
        text,
        kind: /^(Do|Can|Is|Are)\b/.test(text) ? 'yes-no-question' : 'wh-question',
        difficulty: 2,
        expectedAnswers: pattern.answerForms.map((answer) => fill(answer, values)),
      })
    })
  })

  variants.forEach(({ values, base }) => {
    pattern.answerForms.forEach((answer, answerIndex) => {
      const text = fill(answer, values)
      add(results, {
        ...base,
        text,
        kind: answerIndex === 0 ? 'full-answer' : 'short-answer',
        difficulty: 2,
        expectedAnswers: [text],
      })
    })
  })

  return results.slice(0, maxVariants)
}
