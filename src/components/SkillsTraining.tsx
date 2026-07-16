import { useMemo, useState } from 'react'
import { planSession, type TrainingMode } from '../lib/sessionPlanner'
import { recordWordPractice } from '../lib/storage'
import { speak } from '../lib/speech'
import type { Book, VocabularyItem } from '../types/book'
import type { LearningProgress } from '../types/progress'
import { QuestionCard } from './BookLearning'
import { RecordingPanel } from './RecordingPanel'
import { SceneArt } from './SceneArt'

const MODE_INFO: Record<TrainingMode, { title: string; zh: string; icon: string }> = {
  listening: { title: 'Listening', zh: '综合听力', icon: '🎧' },
  reading: { title: 'Reading', zh: '跨绘本阅读', icon: '📚' },
  phonics: { title: 'Phonics & Spelling', zh: '拼读与拼写', icon: '🔤' },
  words: { title: 'Word Games', zh: '认单词互动', icon: '🎯' },
  mixed: { title: 'Mixed Daily Training', zh: '每日混合训练', icon: '🚀' },
}

const LISTENING_MODES = [
  'Word Listening',
  'Phrase Listening',
  'Sentence Listening',
  'Listening Question',
  'Listening Conversation',
  'Listening Action',
  'Recording Answer',
]

const WORD_GAMES = ['Word Catch', 'Word Parking', 'Word Hunt', 'Word Sorting', 'Real Word', 'Memory Match']

interface SkillsTrainingProps {
  initialMode: TrainingMode
  books: Book[]
  progress: LearningProgress
  onProgress: (progress: LearningProgress) => void
  onExit: () => void
}

function allLearnedWords(books: Book[], progress: LearningProgress): VocabularyItem[] {
  return books
    .filter((book) => book.publishingStatus === 'published' && progress.learnedBookIds.includes(book.id))
    .flatMap((book) => book.vocabulary.filter((word) => word.isCore))
}

function ListeningLab({
  books,
  progress,
  onProgress,
}: Omit<SkillsTrainingProps, 'initialMode' | 'onExit'>) {
  const [subMode, setSubMode] = useState(0)
  const [turn, setTurn] = useState(0)
  const [moved, setMoved] = useState(false)
  const plan = useMemo(() => planSession(books, progress, 'listening', 12, Date.now()), [books, progress])
  const question = plan.questions[subMode % Math.max(1, plan.questions.length)]
  const words = allLearnedWords(books, progress)
  const target = question ? words.find((word) => word.id === question.answerId) : words[0]

  if (!question || !target) return <EmptyTraining />

  function answer(correct: boolean) {
    onProgress(recordWordPractice(progress, question.answerId, 'listening', correct))
  }

  return (
    <div className="listening-lab">
      <div className="listening-mode-tabs">
        {LISTENING_MODES.map((mode, index) => (
          <button className={subMode === index ? 'active' : ''} type="button" key={mode} onClick={() => { setSubMode(index); setTurn(0); setMoved(false) }}>
            <b>{index + 1}</b>
            <span>{mode}</span>
          </button>
        ))}
      </div>

      {subMode <= 2 && <QuestionCard question={question} books={books} onAnswer={answer} />}

      {subMode === 3 && (
        <section className="training-question">
          <span>Listening Question</span>
          <SceneArt scene={`🌳|${target.image}|🦆`} label="可点击听力场景" />
          <button className="question-audio" type="button" onClick={() => speak(`Which animal is standing behind the yellow duck? Find the ${target.word}.`)}>
            🔊 Play the question
          </button>
          <button className="scene-target-button" type="button" onClick={() => answer(true)}>{target.image}</button>
        </section>
      )}

      {subMode === 4 && (
        <section className="conversation-card">
          <span>🦊 Momo asks</span>
          <h3>{turn === 0 ? 'What can you see near the tree?' : `What color is the ${target.word}?`}</h3>
          <button type="button" onClick={() => speak(turn === 0 ? 'What can you see near the tree?' : `What color is the ${target.word}?`)}>
            🔊 Listen
          </button>
          <div className="answer-grid text-choices">
            {(turn === 0 ? [target.word, `I can see a ${target.word}.`] : ['brown', 'green', 'yellow']).map((choice) => (
              <button type="button" key={choice} onClick={() => { answer(true); setTurn(Math.min(1, turn + 1)) }}>{choice}</button>
            ))}
          </div>
          <RecordingPanel sentence={turn === 0 ? `I can see a ${target.word}.` : `The ${target.word} is brown.`} wordId={target.id} />
        </section>
      )}

      {subMode === 5 && (
        <section className="action-card">
          <span>Listening Action · 支持触摸点击</span>
          <button type="button" onClick={() => speak(`Move the ${target.word} beside the bear.`)}>
            🔊 Play instruction
          </button>
          <div className={`action-scene ${moved ? 'moved' : ''}`}>
            <button type="button" onClick={() => { setMoved(true); answer(true) }}>{target.image}</button>
            <span>🐻</span>
            <i>pond</i>
          </div>
          <p>{moved ? `Great! The ${target.word} is beside the bear.` : `Touch and move the ${target.word}.`}</p>
        </section>
      )}

      {subMode === 6 && (
        <section className="training-question">
          <span>Recording Answer</span>
          <h3>What can you see near the pond?</h3>
          <button type="button" onClick={() => speak('What can you see near the pond?')}>🔊 Listen</button>
          <RecordingPanel sentence={`I can see a ${target.word} near the pond.`} wordId={target.id} />
        </section>
      )}

      <details className="distribution-report">
        <summary>Session Distribution Report · 开发检查</summary>
        <div>
          <pre>{JSON.stringify(plan.report, null, 2)}</pre>
        </div>
      </details>
    </div>
  )
}

function ReadingLab({
  books,
  progress,
  onProgress,
}: Omit<SkillsTrainingProps, 'initialMode' | 'onExit'>) {
  const activeBooks = books.filter((book) => progress.learnedBookIds.includes(book.id))
  const originals = activeBooks.flatMap((book) => book.pages.map((page) => ({ book, text: page.text, image: page.image })))
  const extensions = activeBooks.flatMap((book) => book.readingExtensions.map((reading) => ({ book, reading })))
  const [index, setIndex] = useState(0)
  const [hint, setHint] = useState(0)
  const current = originals[index % Math.max(1, originals.length)]
  const extension = extensions[0]
  if (!current || !extension) return <EmptyTraining />

  const transformed = `${current.text.replace(/\.$/, '')} near the tree with two friends.`
  return (
    <div className="reading-lab">
      <section className="reading-card">
        <span>{current.book.cover} Original → Transformed Sentence</span>
        <h3>{hint === 0 ? current.text : transformed}</h3>
        {hint >= 2 && <SceneArt compact scene={current.image} label={current.text} />}
        <div className="reading-actions">
          <button type="button" onClick={() => setHint(1)}>高亮关键词</button>
          <button type="button" onClick={() => setHint(2)}>显示图片</button>
          <button type="button" onClick={() => speak(hint ? transformed : current.text, 0.65)}>逐词播放</button>
          <button type="button" onClick={() => speak(hint ? transformed : current.text)}>完整句播放</button>
          <button type="button" onClick={() => { setIndex(index + 1); setHint(0) }}>下一句</button>
        </div>
        <RecordingPanel sentence={hint ? transformed : current.text} bookId={current.book.id} onAttempt={() => {
          const word = current.book.vocabulary.find((item) => current.text.toLowerCase().includes(item.word))
          if (word) onProgress(recordWordPractice(progress, word.id, 'reading', true, hint > 0))
        }} />
      </section>
      <section className="extended-reading-panel">
        <span>Extended Reading · 跨绘本短文</span>
        <h3>{extension.reading.title}</h3>
        {extension.reading.sentences.map((sentence) => <p key={sentence}>{sentence}</p>)}
        <b>{extension.reading.questions[0]?.prompt}</b>
      </section>
    </div>
  )
}

function PhonicsLab({
  books,
  progress,
  onProgress,
}: Omit<SkillsTrainingProps, 'initialMode' | 'onExit'>) {
  const words = allLearnedWords(books, progress)
  const [index, setIndex] = useState(0)
  const [built, setBuilt] = useState<string[]>([])
  const word = words[index % Math.max(1, words.length)]
  if (!word) return <EmptyTraining />
  const letters = [...word.word].sort((left, right) => `${left}${word.id}`.localeCompare(`${right}${word.id}`))
  return (
    <section className="phonics-lab">
      <span>Initial · Ending · Syllables · Chunks · Missing Letters · Listen & Spell</span>
      <div className="phonics-focus">
        <b>{word.image}</b>
        <h3>{word.phonics}</h3>
        <p>{word.syllables.join(' + ')}</p>
      </div>
      <button type="button" onClick={() => speak(word.word, 0.66)}>🔊 听音拼词</button>
      <div className="built-word">{built.join('') || '_ '.repeat(word.word.length)}</div>
      <div className="letter-pool">
        {letters.map((letter, letterIndex) => (
          <button type="button" key={`${letter}-${letterIndex}`} onClick={() => setBuilt([...built, letter])}>{letter}</button>
        ))}
      </div>
      <button type="button" onClick={() => {
        const correct = built.join('') === word.word
        onProgress(recordWordPractice(progress, word.id, 'spelling', correct))
        if (correct) {
          speak(word.exampleSentences[0])
          setIndex(index + 1)
        }
        setBuilt([])
      }}>拼完后放进句子</button>
      <p>{word.exampleSentences[0]}</p>
    </section>
  )
}

function WordGamesLab({
  books,
  progress,
  onProgress,
}: Omit<SkillsTrainingProps, 'initialMode' | 'onExit'>) {
  const words = allLearnedWords(books, progress)
  const [game, setGame] = useState(0)
  const [matched, setMatched] = useState<string[]>([])
  const target = words[game % Math.max(1, words.length)]
  if (!target) return <EmptyTraining />

  return (
    <div className="word-games-lab">
      <div className="game-tabs">
        {WORD_GAMES.map((name, index) => (
          <button className={game === index ? 'active' : ''} type="button" key={name} onClick={() => { setGame(index); setMatched([]) }}>
            {name}
          </button>
        ))}
      </div>
      <section className={`word-game game-${game}`}>
        <span>{WORD_GAMES[game]} · 手机和平板可直接触摸</span>
        <button type="button" onClick={() => speak(target.word)}>🔊 {game === 0 ? '听词抓单词' : '播放目标'}</button>
        {game === 0 && (
          <div className="floating-words">
            {words.slice(0, 8).map((word, index) => (
              <button
                type="button"
                style={{ '--float-index': index } as React.CSSProperties}
                key={word.id}
                onClick={() => onProgress(recordWordPractice(progress, target.id, 'listening', word.id === target.id))}
              >
                {word.word}
              </button>
            ))}
          </div>
        )}
        {game === 1 && (
          <div className="parking-board">
            <button type="button" onClick={() => setMatched([target.id])}>{target.image}</button>
            <button className={matched.includes(target.id) ? 'parked' : ''} type="button" onClick={() => onProgress(recordWordPractice(progress, target.id, 'reading', matched.includes(target.id)))}>
              P · {target.word}
            </button>
          </div>
        )}
        {game === 2 && (
          <div className="word-hunt-scene">
            <SceneArt scene={`🌳|${target.image}|🌼|🪨`} label="Word hunt" />
            <button type="button" onClick={() => onProgress(recordWordPractice(progress, target.id, 'reading', true))}>{target.word}</button>
          </div>
        )}
        {game === 3 && (
          <div className="sorting-board">
            {['animal', 'color', 'action'].map((category) => (
              <button type="button" key={category} onClick={() => onProgress(recordWordPractice(progress, target.id, 'reading', target.category === category))}>
                {category}
              </button>
            ))}
            <b>{target.word}</b>
          </div>
        )}
        {game === 4 && (
          <div className="answer-grid text-choices">
            {[target.word, `${target.word}e`, target.word.slice(0, -1), `${target.word[0]}${target.word}`].map((choice, index) => (
              <button type="button" key={`${choice}-${index}`} onClick={() => onProgress(recordWordPractice(progress, target.id, 'spelling', choice === target.word))}>{choice}</button>
            ))}
          </div>
        )}
        {game === 5 && (
          <div className="memory-grid">
            {[...words.slice(0, 4), ...words.slice(0, 4)].map((word, index) => (
              <button type="button" className={matched.includes(`${word.id}-${index}`) ? 'open' : ''} key={`${word.id}-${index}`} onClick={() => setMatched([...matched, `${word.id}-${index}`])}>
                {matched.includes(`${word.id}-${index}`) ? (index < 4 ? word.image : word.word) : '❓'}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MixedLab({
  books,
  progress,
  onProgress,
}: Omit<SkillsTrainingProps, 'initialMode' | 'onExit'>) {
  const plan = useMemo(() => planSession(books, progress, 'mixed', 12, Date.now()), [books, progress])
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState('')
  const question = plan.questions[index]
  if (!question) return <EmptyTraining />
  return (
    <div className="mixed-lab">
      <div className="session-progress"><i style={{ width: `${((index + 1) / plan.questions.length) * 100}%` }} /></div>
      <QuestionCard
        question={question}
        books={books}
        onAnswer={(correct) => {
          onProgress(recordWordPractice(progress, question.answerId, question.format === 'word' ? 'listening' : 'reading', correct))
          setFeedback(correct ? 'Great! ⭐' : 'Listen and try again.')
          if (correct) window.setTimeout(() => { setIndex((index + 1) % plan.questions.length); setFeedback('') }, 480)
        }}
      />
      {feedback && <p className={feedback.startsWith('Great') ? 'feedback good' : 'feedback gentle'}>{feedback}</p>}
      <details className="distribution-report">
        <summary>Session Distribution Report</summary>
        <pre>{JSON.stringify(plan.report, null, 2)}</pre>
      </details>
    </div>
  )
}

function EmptyTraining() {
  return (
    <section className="empty-state">
      <span>📚</span>
      <h2>先学习一本绘本</h2>
      <p>综合训练只会调用已经打开学习过、并且状态为 published 的绘本。</p>
    </section>
  )
}

export function SkillsTraining({
  initialMode,
  books,
  progress,
  onProgress,
  onExit,
}: SkillsTrainingProps) {
  const [mode, setMode] = useState<TrainingMode>(initialMode)
  const info = MODE_INFO[mode]
  return (
    <main className="skills-training page-shell">
      <header className="learning-header">
        <button type="button" onClick={onExit}>← 返回双中心首页</button>
        <div><span>{info.icon}</span><b>{info.title}</b></div>
        <button type="button" onClick={() => speak(info.title)}>🔊 重复播放</button>
      </header>
      <nav className="skills-mode-nav">
        {(Object.keys(MODE_INFO) as TrainingMode[]).map((key) => (
          <button className={mode === key ? 'active' : ''} type="button" key={key} onClick={() => setMode(key)}>
            <span>{MODE_INFO[key].icon}</span>
            <b>{MODE_INFO[key].title}</b>
            <small>{MODE_INFO[key].zh}</small>
          </button>
        ))}
      </nav>
      <section className="skills-content">
        <div className="stage-heading">
          <span>{info.icon}</span>
          <div><small>SKILLS TRAINING</small><h1>{info.title}</h1><p>{info.zh} · 内容来自已学绘本和薄弱词</p></div>
        </div>
        {mode === 'listening' && <ListeningLab books={books} progress={progress} onProgress={onProgress} />}
        {mode === 'reading' && <ReadingLab books={books} progress={progress} onProgress={onProgress} />}
        {mode === 'phonics' && <PhonicsLab books={books} progress={progress} onProgress={onProgress} />}
        {mode === 'words' && <WordGamesLab books={books} progress={progress} onProgress={onProgress} />}
        {mode === 'mixed' && <MixedLab books={books} progress={progress} onProgress={onProgress} />}
      </section>
    </main>
  )
}
