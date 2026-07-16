import { useMemo, useState } from 'react'
import { generateSentences } from '../lib/sentenceGenerator'
import { planSession, type PlannedQuestion } from '../lib/sessionPlanner'
import {
  completeBookStage,
  markBookStarted,
  recordPatternPractice,
  recordWordPractice,
} from '../lib/storage'
import { speak } from '../lib/speech'
import type { Book, VocabularyItem } from '../types/book'
import type { LearningProgress } from '../types/progress'
import { RecordingPanel } from './RecordingPanel'
import { RewardOverlay } from './RewardOverlay'
import { SceneArt } from './SceneArt'

const STAGES = [
  ['Story Introduction', '故事导入', '📖'],
  ['Vocabulary', '核心单词', '🧩'],
  ['Sentence Patterns', '句型变形', '💬'],
  ['Story Comprehension', '故事理解', '🔎'],
  ['Reading & Speaking', '阅读与表达', '🎙️'],
  ['Book Challenge', '绘本挑战', '🏆'],
] as const

const VOCAB_MODES = [
  '看图听词',
  '看图选词',
  '听音选图',
  '图片单词配对',
  '缺字母',
  '字母排序',
  '放入句子',
  '延迟复习',
]

interface BookLearningProps {
  book: Book
  progress: LearningProgress
  onProgress: (progress: LearningProgress) => void
  onExit: () => void
}

function choiceWords(book: Book, word: VocabularyItem): VocabularyItem[] {
  return [
    word,
    ...book.vocabulary
      .filter((item) => item.id !== word.id)
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, 3),
  ].sort((left, right) => `${left.id}-${word.id}`.localeCompare(`${right.id}-${word.id}`))
}

function VocabularyCycle({
  book,
  progress,
  onProgress,
}: {
  book: Book
  progress: LearningProgress
  onProgress: (progress: LearningProgress) => void
}) {
  const coreWords = book.vocabulary.filter((word) => word.isCore)
  const [wordIndex, setWordIndex] = useState(0)
  const [modeIndex, setModeIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [letterPool, setLetterPool] = useState<string[]>([])
  const [feedback, setFeedback] = useState('')
  const word = coreWords[wordIndex]
  const choices = choiceWords(book, word)

  function score(correct: boolean, metric: 'listening' | 'reading' | 'spelling') {
    onProgress(recordWordPractice(progress, word.id, metric, correct))
    setFeedback(correct ? 'Great! 答对啦 ⭐' : '再听一次，再试试看。')
  }

  function next() {
    setFeedback('')
    setAnswer('')
    setLetterPool([])
    if (modeIndex < VOCAB_MODES.length - 1) setModeIndex(modeIndex + 1)
    else {
      setModeIndex(0)
      setWordIndex((wordIndex + 1) % coreWords.length)
    }
  }

  function missingWord() {
    if (word.word.length < 4) return `${word.word[0]}_${word.word.at(-1)}`
    return `${word.word.slice(0, 2)}${'_'.repeat(word.word.length - 3)}${word.word.at(-1)}`
  }

  return (
    <div className="vocab-cycle">
      <div className="sub-progress">
        <b>
          {wordIndex + 1}/{coreWords.length} · {word.word}
        </b>
        <span>{VOCAB_MODES[modeIndex]}</span>
      </div>
      <div className="mode-pills" aria-label="单词练习模式">
        {VOCAB_MODES.map((mode, index) => (
          <button
            className={index === modeIndex ? 'active' : ''}
            type="button"
            key={mode}
            onClick={() => {
              setModeIndex(index)
              setFeedback('')
              setAnswer('')
              setLetterPool([])
            }}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {modeIndex === 0 && (
        <div className="word-showcase">
          <button className="word-picture" type="button" onClick={() => speak(word.word)}>
            <span>{word.image}</span>
            <b>{word.word}</b>
            <small>{word.meaning}</small>
          </button>
          <p>{word.phonics} · {word.syllables.join(' · ')}</p>
          <button type="button" onClick={() => score(true, 'listening')}>
            🔊 听完了
          </button>
        </div>
      )}

      {modeIndex === 1 && (
        <div className="practice-block">
          <span className="focus-emoji">{word.image}</span>
          <h3>Which word is this?</h3>
          <div className="answer-grid text-choices">
            {choices.map((choice) => (
              <button type="button" key={choice.id} onClick={() => score(choice.id === word.id, 'reading')}>
                {choice.word}
              </button>
            ))}
          </div>
        </div>
      )}

      {modeIndex === 2 && (
        <div className="practice-block">
          <button className="listen-orb" type="button" onClick={() => speak(word.word)}>
            🔊
          </button>
          <h3>Listen and choose the picture.</h3>
          <div className="answer-grid picture-choices">
            {choices.map((choice) => (
              <button type="button" key={choice.id} onClick={() => score(choice.id === word.id, 'listening')}>
                <span>{choice.image}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {modeIndex === 3 && (
        <div className="practice-block matching-practice">
          <h3>Match the picture and word.</h3>
          <button type="button" className="match-picture" onClick={() => setAnswer(word.id)}>
            {word.image}
          </button>
          <div className="answer-grid text-choices">
            {choices.map((choice) => (
              <button
                className={answer && choice.id === word.id ? 'matched' : ''}
                type="button"
                key={choice.id}
                onClick={() => score(answer === word.id && choice.id === word.id, 'reading')}
              >
                {choice.word}
              </button>
            ))}
          </div>
        </div>
      )}

      {modeIndex === 4 && (
        <div className="practice-block">
          <span className="focus-emoji">{word.image}</span>
          <h3 className="missing-word">{missingWord()}</h3>
          <input
            aria-label="输入完整单词"
            value={answer}
            onChange={(event) => setAnswer(event.target.value.toLowerCase())}
            placeholder="type the word"
          />
          <button type="button" onClick={() => score(answer.trim() === word.word, 'spelling')}>
            检查单词
          </button>
        </div>
      )}

      {modeIndex === 5 && (
        <div className="practice-block">
          <span className="focus-emoji">{word.image}</span>
          <div className="built-word">
            {letterPool.length ? letterPool.join('') : '点击字母拼出单词'}
          </div>
          <div className="letter-pool">
            {[...word.word].sort((left, right) => `${left}${word.id}`.localeCompare(`${right}${word.id}`)).map((letter, index) => (
              <button
                type="button"
                key={`${letter}-${index}`}
                onClick={() => setLetterPool([...letterPool, letter])}
              >
                {letter}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              score(letterPool.join('') === word.word, 'spelling')
              setLetterPool([])
            }}
          >
            检查拼写
          </button>
        </div>
      )}

      {modeIndex === 6 && (
        <div className="practice-block">
          <h3>{(word.exampleSentences[0] ?? `I see ${word.word}.`).replace(new RegExp(word.word, 'i'), '_____')}</h3>
          <div className="answer-grid text-choices">
            {choices.map((choice) => (
              <button type="button" key={choice.id} onClick={() => score(choice.id === word.id, 'reading')}>
                {choice.word}
              </button>
            ))}
          </div>
        </div>
      )}

      {modeIndex === 7 && (
        <div className="practice-block review-card">
          <span>🧠</span>
          <h3>不用看提示：这个词怎么读？什么意思？</h3>
          <b>{word.word}</b>
          <button type="button" onClick={() => speak(word.word, 0.72)}>
            我先回答，再听标准音
          </button>
          <div className="answer-grid text-choices">
            <button type="button" onClick={() => score(true, 'reading')}>记得</button>
            <button type="button" onClick={() => score(false, 'reading')}>还要复习</button>
          </div>
        </div>
      )}

      {feedback && <p className={feedback.startsWith('Great') ? 'feedback good' : 'feedback gentle'}>{feedback}</p>}
      <button className="next-button" type="button" onClick={next}>
        下一步 →
      </button>
    </div>
  )
}

function StoryIntroduction({ book }: { book: Book }) {
  const [pageIndex, setPageIndex] = useState(0)
  const [showTranslation, setShowTranslation] = useState(false)
  const [activeWord, setActiveWord] = useState(-1)
  const page = book.pages[pageIndex]
  const words = page.text.split(' ')

  function play(rate: number) {
    setActiveWord(0)
    speak(page.text, rate, (charIndex) => {
      const before = page.text.slice(0, charIndex)
      setActiveWord(Math.max(0, before.split(/\s+/).length - 1))
    })
  }

  return (
    <div className="story-introduction">
      <SceneArt scene={page.image} label={page.text} />
      <div className="story-text" aria-live="polite">
        {words.map((word, index) => {
          const clean = word.replace(/[.,!?]/g, '').toLowerCase()
          const focus = page.focusWords.some((id) => {
            const item = book.vocabulary.find((entry) => entry.id === id)
            return item?.word.toLowerCase() === clean
          })
          return (
            <button
              className={`${index === activeWord ? 'active' : ''} ${focus ? 'focus' : ''}`}
              type="button"
              key={`${word}-${index}`}
              onClick={() => speak(clean, 0.72)}
            >
              {word}
            </button>
          )
        })}
      </div>
      {showTranslation && <p className="translation">{page.optionalTranslation}</p>}
      <div className="story-controls">
        <button type="button" onClick={() => play(0.88)}>🔊 单句播放</button>
        <button type="button" onClick={() => play(0.62)}>🐢 慢速播放</button>
        <button type="button" onClick={() => setShowTranslation(!showTranslation)}>
          {showTranslation ? '隐藏中文' : '显示中文'}
        </button>
      </div>
      <div className="page-dots">
        {book.pages.map((item, index) => (
          <button
            className={index === pageIndex ? 'active' : ''}
            type="button"
            key={item.id}
            onClick={() => {
              setPageIndex(index)
              setActiveWord(-1)
            }}
            aria-label={`第 ${index + 1} 页`}
          />
        ))}
      </div>
      <RecordingPanel sentence={page.text} bookId={book.id} pageId={page.id} />
    </div>
  )
}

function SentencePatterns({
  book,
  progress,
  onProgress,
}: {
  book: Book
  progress: LearningProgress
  onProgress: (progress: LearningProgress) => void
}) {
  const [patternIndex, setPatternIndex] = useState(0)
  const [variantIndex, setVariantIndex] = useState(0)
  const pattern = book.sentencePatterns[patternIndex]
  const sentences = useMemo(
    () => generateSentences(book.id, pattern, 18),
    [book.id, pattern],
  )
  const sentence = sentences[variantIndex % sentences.length]

  return (
    <div className="sentence-patterns">
      <div className="pattern-tabs">
        {book.sentencePatterns.map((item, index) => (
          <button
            className={index === patternIndex ? 'active' : ''}
            type="button"
            key={item.id}
            onClick={() => {
              setPatternIndex(index)
              setVariantIndex(0)
              onProgress(recordPatternPractice(progress, item.id, 'comprehension', true))
            }}
          >
            Pattern {index + 1}
          </button>
        ))}
      </div>
      <p className="pattern-template">{pattern.pattern}</p>
      <div className="slot-board">
        {pattern.slots.map((slot) => (
          <div key={slot}>
            <b>{slot}</b>
            <span>{pattern.replacements[slot].join(' · ')}</span>
          </div>
        ))}
      </div>
      <section className="generated-sentence-card">
        <small>LEVEL {sentence.difficulty} · {sentence.kind}</small>
        <h3>{sentence.text}</h3>
        <p>Target words: {sentence.targetWords.join(' · ')}</p>
        <div>
          <button type="button" onClick={() => {
            speak(sentence.text)
            onProgress(recordPatternPractice(progress, pattern.id, 'reading', true))
          }}>🔊 完整播放</button>
          <button type="button" onClick={() => {
            speak(sentence.text, 0.62)
            onProgress(recordPatternPractice(progress, pattern.id, 'reading', true))
          }}>🐢 逐词慢读</button>
          <button type="button" onClick={() => {
            setVariantIndex((variantIndex + 1) % sentences.length)
            onProgress(recordPatternPractice(progress, pattern.id, 'fill-blank', true))
          }}>
            🔄 下一种变形
          </button>
        </div>
      </section>
      <div className="sentence-levels">
        {sentences.slice(0, 8).map((item, index) => (
          <button
            className={index === variantIndex ? 'active' : ''}
            type="button"
            key={item.id}
            onClick={() => {
              setVariantIndex(index)
              onProgress(recordPatternPractice(progress, pattern.id, 'ordering', true))
            }}
          >
            {item.text}
          </button>
        ))}
      </div>
      <RecordingPanel
        sentence={sentence.text}
        bookId={book.id}
        onAttempt={() => onProgress(recordPatternPractice(progress, pattern.id, 'speaking', true))}
      />
    </div>
  )
}

function StoryComprehension({ book }: { book: Book }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [sequence, setSequence] = useState<string[]>([])

  return (
    <div className="comprehension-list">
      {book.comprehensionQuestions.map((question, index) => (
        <section key={question.id}>
          <span>Question {index + 1} · {question.type}</span>
          <h3>{question.prompt}</h3>
          {question.type === 'sequence' ? (
            <>
              <div className="sequence-answer">
                {sequence.map((item, itemIndex) => (
                  <button type="button" key={`${item}-${itemIndex}`} onClick={() => setSequence(sequence.filter((_, selected) => selected !== itemIndex))}>
                    {itemIndex + 1}. {item}
                  </button>
                ))}
              </div>
              <div className="answer-grid text-choices">
                {question.choices?.map((choice) => (
                  <button type="button" key={choice} onClick={() => setSequence([...sequence, choice])}>
                    {choice}
                  </button>
                ))}
              </div>
              <p>{sequence.join('|') === question.answers.join('|') ? 'Great sequence! ⭐' : '按故事顺序点击。'}</p>
            </>
          ) : question.choices?.length ? (
            <div className="answer-grid text-choices">
              {question.choices.map((choice) => (
                <button
                  className={answers[question.id] === choice ? 'selected' : ''}
                  type="button"
                  key={choice}
                  onClick={() => setAnswers({ ...answers, [question.id]: choice })}
                >
                  {choice}
                </button>
              ))}
            </div>
          ) : (
            <div className="short-answer-row">
              <input
                aria-label={question.prompt}
                value={answers[question.id] ?? ''}
                onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                placeholder="word or short sentence"
              />
              <button type="button" onClick={() => speak(question.answers[0])}>听参考答案</button>
            </div>
          )}
          {answers[question.id] && (
            <p className={question.answers.some((answer) => answer.toLowerCase() === answers[question.id].toLowerCase()) ? 'feedback good' : 'feedback gentle'}>
              {question.answers.some((answer) => answer.toLowerCase() === answers[question.id].toLowerCase())
                ? 'Great answer!'
                : `Try: ${question.answers[0]}`}
            </p>
          )}
          <RecordingPanel sentence={question.answers.at(-1) ?? question.answers[0]} bookId={book.id} />
        </section>
      ))}
    </div>
  )
}

function ReadingSpeaking({
  book,
  progress,
  onProgress,
}: {
  book: Book
  progress: LearningProgress
  onProgress: (progress: LearningProgress) => void
}) {
  const extension = book.readingExtensions[0]
  const [hintLevel, setHintLevel] = useState(0)
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const sentence = extension.sentences[sentenceIndex]

  function applyHint(level: number) {
    setHintLevel(level)
    const focusId = book.vocabulary.find((word) => sentence.toLowerCase().includes(word.word.toLowerCase()))?.id
    if (focusId) onProgress(recordWordPractice(progress, focusId, 'reading', true, true))
  }

  return (
    <div className="reading-speaking">
      <section className="reading-card">
        <span>Extended Reading · {extension.title}</span>
        <h3 className={hintLevel >= 1 ? 'hint-keywords' : ''}>{sentence}</h3>
        {hintLevel >= 2 && <SceneArt compact scene={book.pages[sentenceIndex % book.pages.length].image} label={sentence} />}
        {hintLevel >= 3 && (
          <div className="clickable-words">
            {sentence.split(' ').map((word, index) => (
              <button type="button" key={`${word}-${index}`} onClick={() => speak(word.replace(/[.,!?]/g, ''), 0.7)}>
                {word}
              </button>
            ))}
          </div>
        )}
        <div className="reading-actions">
          <button type="button" onClick={() => applyHint(1)}>1 高亮关键词</button>
          <button type="button" onClick={() => applyHint(2)}>2 显示图片</button>
          <button type="button" onClick={() => applyHint(3)}>3 点词发音</button>
          <button type="button" onClick={() => { applyHint(4); speak(sentence, 0.6) }}>4 逐词播放</button>
          <button type="button" onClick={() => { applyHint(5); speak(sentence) }}>5 完整句播放</button>
        </div>
        <div className="page-navigation">
          <button type="button" disabled={sentenceIndex === 0} onClick={() => { setSentenceIndex(sentenceIndex - 1); setHintLevel(0) }}>
            ← 上一句
          </button>
          <b>{sentenceIndex + 1} / {extension.sentences.length}</b>
          <button type="button" disabled={sentenceIndex === extension.sentences.length - 1} onClick={() => { setSentenceIndex(sentenceIndex + 1); setHintLevel(0) }}>
            下一句 →
          </button>
        </div>
      </section>
      <RecordingPanel sentence={sentence} bookId={book.id} onAttempt={() => {
        const focus = book.vocabulary.find((word) => sentence.toLowerCase().includes(word.word.toLowerCase()))
        if (focus) onProgress(recordWordPractice(progress, focus.id, 'speaking', true))
      }} />
    </div>
  )
}

interface ChallengeItem {
  id: string
  kind: string
  prompt: string
  answer?: string
  choices?: string[]
  sentence?: string
}

function createChallenge(book: Book, progress: LearningProgress): ChallengeItem[] {
  const marked = markBookStarted(progress, book.id)
  const planned = planSession([book], marked, 'mixed', 6, 20260716).questions
  const sequence = book.comprehensionQuestions.find((question) => question.type === 'sequence')
  const reading = book.readingExtensions[0]
  return [
    ...planned.slice(0, 2).map((question, index) => ({
      id: `listen-${question.id}`,
      kind: 'listening',
      prompt: question.prompt,
      answer: question.answerId,
      choices: question.choices,
      sentence: `Listening ${index + 1}`,
    })),
    ...planned.slice(2, 4).map((question) => ({
      id: `word-${question.id}`,
      kind: 'word',
      prompt: `Choose: ${question.prompt}`,
      answer: question.answerId,
      choices: question.choices,
    })),
    ...planned.slice(4, 6).map((question) => ({
      id: `sentence-${question.id}`,
      kind: 'sentence',
      prompt: question.sentence ?? question.prompt,
      answer: question.answerId,
      choices: question.choices,
    })),
    {
      id: 'sequence',
      kind: 'story-order',
      prompt: sequence?.prompt ?? 'Put the story in order.',
      answer: sequence?.answers.join('|'),
      choices: sequence?.choices,
    },
    {
      id: 'reading',
      kind: 'reading',
      prompt: reading.sentences.join(' '),
      answer: reading.questions[0]?.answers[0],
      choices: [
        reading.questions[0]?.answers[0] ?? 'answer',
        ...book.vocabulary.slice(0, 3).map((word) => word.id),
      ],
    },
    {
      id: 'recording',
      kind: 'recording',
      prompt: `Tell me about ${book.cover} ${book.title}.`,
      sentence: reading.sentences.at(-1) ?? book.pages.at(-1)?.text,
    },
  ]
}

function Challenge({
  book,
  progress,
  onFinish,
}: {
  book: Book
  progress: LearningProgress
  onFinish: (score: number) => void
}) {
  const questions = useMemo(() => createChallenge(book, progress), [book, progress])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [sequence, setSequence] = useState<string[]>([])
  const question = questions[index]

  function answer(value: string) {
    const correct =
      question.kind === 'story-order'
        ? [...sequence, value].join('|') === question.answer
        : value === question.answer
    if (correct) setScore(score + 1)
    window.setTimeout(() => {
      if (index === questions.length - 1) onFinish(score + (correct ? 1 : 0))
      else {
        setIndex(index + 1)
        setSequence([])
      }
    }, 420)
  }

  if (question.kind === 'recording') {
    return (
      <div className="challenge-card">
        <span>Challenge {index + 1}/{questions.length} · Recording</span>
        <h3>{question.prompt}</h3>
        <RecordingPanel sentence={question.sentence ?? question.prompt} bookId={book.id} />
        <button className="next-button" type="button" onClick={() => onFinish(score + 1)}>
          完成表达挑战
        </button>
      </div>
    )
  }

  return (
    <div className="challenge-card">
      <span>Challenge {index + 1}/{questions.length} · {question.kind}</span>
      {question.kind === 'listening' ? (
        <button className="listen-orb" type="button" onClick={() => speak(question.prompt)}>🔊</button>
      ) : (
        <h3>{question.prompt}</h3>
      )}
      {question.kind === 'story-order' && (
        <div className="sequence-answer">
          {sequence.map((item, itemIndex) => <span key={`${item}-${itemIndex}`}>{itemIndex + 1}. {item}</span>)}
        </div>
      )}
      <div className="answer-grid text-choices">
        {question.choices?.map((choice) => {
          const word = book.vocabulary.find((item) => item.id === choice)
          return (
            <button
              type="button"
              key={choice}
              onClick={() => {
                if (question.kind === 'story-order') {
                  const next = [...sequence, choice]
                  setSequence(next)
                  if (next.length === question.choices?.length) answer(choice)
                } else answer(choice)
              }}
            >
              {word?.image} {word?.word ?? choice}
            </button>
          )
        })}
      </div>
      <p>Score: {score}</p>
    </div>
  )
}

export function BookLearning({ book, progress, onProgress, onExit }: BookLearningProps) {
  const initialStage = progress.books[book.id]?.currentStage ?? 1
  const [stage, setStage] = useState(initialStage)
  const [reward, setReward] = useState(false)
  const startedProgress = useMemo(() => markBookStarted(progress, book.id), [book.id, progress])

  function goToStage(next: number) {
    const updated = markBookStarted(progress, book.id)
    onProgress(updated)
    setStage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function completeCurrent() {
    onProgress(completeBookStage(progress, book.id, stage))
    if (stage < 6) goToStage(stage + 1)
  }

  return (
    <main className="book-learning page-shell">
      <header className="learning-header">
        <button type="button" onClick={onExit}>← 退出并保存</button>
        <div>
          <span>{book.cover}</span>
          <b>{book.title}</b>
        </div>
        <button type="button" onClick={() => {
          const page = book.pages[(stage - 1) % book.pages.length]
          speak(page.text)
        }}>🔊 重复播放</button>
      </header>
      <nav className="stage-map" aria-label="绘本学习阶段">
        {STAGES.map(([english, chinese, icon], index) => (
          <button
            className={`${stage === index + 1 ? 'active' : ''} ${startedProgress.books[book.id]?.completedStages.includes(index + 1) ? 'done' : ''}`}
            type="button"
            key={english}
            onClick={() => goToStage(index + 1)}
          >
            <span>{icon}</span>
            <b>{index + 1}. {english}</b>
            <small>{chinese}</small>
          </button>
        ))}
      </nav>
      <section className="stage-content">
        <div className="stage-heading">
          <span>{STAGES[stage - 1][2]}</span>
          <div>
            <small>STAGE {stage} OF 6</small>
            <h1>{STAGES[stage - 1][0]}</h1>
            <p>{STAGES[stage - 1][1]} · 每一步都会保存进度</p>
          </div>
        </div>
        {stage === 1 && <StoryIntroduction book={book} />}
        {stage === 2 && <VocabularyCycle book={book} progress={progress} onProgress={onProgress} />}
        {stage === 3 && <SentencePatterns book={book} progress={progress} onProgress={onProgress} />}
        {stage === 4 && <StoryComprehension book={book} />}
        {stage === 5 && <ReadingSpeaking book={book} progress={progress} onProgress={onProgress} />}
        {stage === 6 && (
          <Challenge
            book={book}
            progress={progress}
            onFinish={(score) => {
              const completed = completeBookStage(progress, book.id, 6)
              onProgress({
                ...completed,
                stars: completed.stars + book.rewards.stars,
                stickers: [...new Set([...completed.stickers, book.rewards.badge])],
                books: {
                  ...completed.books,
                  [book.id]: {
                    ...completed.books[book.id],
                    challengeBest: Math.max(completed.books[book.id].challengeBest, score),
                  },
                },
              })
              setReward(true)
            }}
          />
        )}
        {stage < 6 && (
          <button className="complete-stage-button" type="button" onClick={completeCurrent}>
            完成本阶段，继续 →
          </button>
        )}
      </section>
      {reward && (
        <RewardOverlay
          title={book.rewards.badge}
          message={book.rewards.message}
          stars={book.rewards.stars}
          onDone={onExit}
        />
      )}
    </main>
  )
}

export function QuestionCard({
  question,
  books,
  onAnswer,
}: {
  question: PlannedQuestion
  books: Book[]
  onAnswer: (correct: boolean) => void
}) {
  const book = books.find((item) => item.id === question.sourceBookId)
  const wordById = (id: string) => books.flatMap((item) => item.vocabulary).find((word) => word.id === id)
  return (
    <section className="training-question">
      <span>{book?.cover} {book?.title} · {question.format}</span>
      {question.mode === 'listening' ? (
        <>
          <button className="listen-orb" type="button" onClick={() => speak(question.prompt)}>🔊</button>
          <h3>Listen and choose.</h3>
        </>
      ) : (
        <h3>{question.prompt}</h3>
      )}
      <div className="answer-grid picture-choices">
        {question.choices.map((choice) => {
          const word = wordById(choice)
          return (
            <button type="button" key={choice} onClick={() => onAnswer(choice === question.answerId)}>
              <span>{word?.image ?? '🔤'}</span>
              <b>{word?.word ?? choice}</b>
            </button>
          )
        })}
      </div>
    </section>
  )
}
