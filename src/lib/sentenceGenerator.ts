import type { GeneratedSentence, SentencePattern } from '../types/book'

const LOCATION_PHRASES = ['near the tree', 'beside the pond', 'behind the yellow duck']
const ACTION_PHRASES = ['looking at me', 'walking with a friend', 'playing near the pond']

function pluralize(word: string): string {
  if (word === 'fish') return 'fish'
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`
  return `${word}s`
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}

function fill(template: string, values: Record<string, string>): string {
  return template
    .replace(/\{(\w+)\}/g, (_, slot: string) => values[slot] ?? slot)
    .replace(/\ba ([aeiou]\w*)/gi, 'an $1')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstValues(pattern: SentencePattern, variant: number): Record<string, string> {
  return Object.fromEntries(
    pattern.slots.map((slot, index) => {
      const choices = pattern.replacements[slot] ?? [slot]
      return [slot, choices[(variant + index) % choices.length]]
    }),
  )
}

function add(
  results: GeneratedSentence[],
  sentence: Omit<GeneratedSentence, 'id'>,
): void {
  if (results.some((item) => item.text === sentence.text && item.kind === sentence.kind)) return
  results.push({ ...sentence, id: `${sentence.sourcePatternId}-${results.length + 1}` })
}

export function generateSentences(
  sourceBookId: string,
  pattern: SentencePattern,
  maxVariants = 18,
): GeneratedSentence[] {
  const results: GeneratedSentence[] = []
  const rounds = Math.max(2, Math.min(5, maxVariants))

  for (let variant = 0; variant < rounds; variant += 1) {
    const values = firstValues(pattern, variant)
    const animal = values.animal ?? values.subject
    const color = values.color ?? ''
    const action = values.action ?? 'play'
    const place = values.place ?? 'tree'
    const statement = fill(pattern.pattern, values)
    const targets = [...new Set(Object.values(values))]
    const base = {
      sourceBookId,
      sourcePatternId: pattern.id,
      targetWords: targets,
    }

    add(results, {
      ...base,
      text: statement,
      kind: 'statement',
      difficulty: 1,
      expectedAnswers: [statement],
    })

    if (animal) {
      const pluralAnimal = pluralize(animal)
      const pluralText = color
        ? `I see two ${color} ${pluralAnimal}.`
        : `Two ${pluralAnimal} are near the ${place}.`
      add(results, {
        ...base,
        text: pluralText,
        kind: 'plural',
        difficulty: 2,
        targetWords: [...targets, 'two'],
        expectedAnswers: [pluralText],
      })

      const nounPhrase = [color, animal].filter(Boolean).join(' ')
      const yesNo = `Do you see ${article(nounPhrase)} ${nounPhrase}?`
      add(results, {
        ...base,
        text: yesNo,
        kind: 'yes-no-question',
        difficulty: 2,
        expectedAnswers: ['Yes, I do.', 'No, I do not.'],
      })

      add(results, {
        ...base,
        text: 'What can you see?',
        kind: 'wh-question',
        difficulty: 2,
        expectedAnswers: [statement],
      })

      add(results, {
        ...base,
        text: `${article(nounPhrase).replace(/^./, (char) => char.toUpperCase())} ${nounPhrase}.`,
        kind: 'short-answer',
        difficulty: 2,
        expectedAnswers: [statement],
      })

      add(results, {
        ...base,
        text: `I can see ${article(nounPhrase)} ${nounPhrase}.`,
        kind: 'full-answer',
        difficulty: 2,
        expectedAnswers: [`I can see ${article(nounPhrase)} ${nounPhrase}.`],
      })

      const location = LOCATION_PHRASES[variant % LOCATION_PHRASES.length]
      add(results, {
        ...base,
        text: `I see ${article(nounPhrase)} ${nounPhrase} ${location}.`,
        kind: 'location',
        difficulty: 3,
        targetWords: [...targets, ...location.split(' ')],
        expectedAnswers: [animal, location],
      })

      const actionPhrase = pattern.slots.includes('action')
        ? `${action} near the ${place}`
        : ACTION_PHRASES[variant % ACTION_PHRASES.length]
      add(results, {
        ...base,
        text: `The ${nounPhrase} is ${actionPhrase}.`,
        kind: 'action',
        difficulty: 3,
        targetWords: [...targets, ...actionPhrase.split(' ')],
        expectedAnswers: [animal, action],
      })
    } else {
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
    }
  }

  pattern.questionForms.forEach((question, index) => {
    const values = firstValues(pattern, index)
    add(results, {
      text: fill(question, values),
      kind: question.startsWith('Do ') || question.startsWith('Can ') ? 'yes-no-question' : 'wh-question',
      sourceBookId,
      sourcePatternId: pattern.id,
      difficulty: 2,
      targetWords: Object.values(values),
      expectedAnswers: pattern.answerForms.map((answer) => fill(answer, values)),
    })
  })

  return results.slice(0, maxVariants)
}
