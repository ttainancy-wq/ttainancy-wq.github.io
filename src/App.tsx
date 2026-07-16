import { useEffect, useMemo, useState } from 'react'
import { BookLearning } from './components/BookLearning'
import { ParentZone } from './components/ParentZone'
import { SkillsTraining } from './components/SkillsTraining'
import { loadBooks, loadProgress, markBookStarted, saveBooks, saveProgress, createProgress } from './lib/storage'
import { setSpeechEnabled, speak } from './lib/speech'
import type { Book } from './types/book'
import type { LearningProgress } from './types/progress'
import type { TrainingMode } from './lib/sessionPlanner'

type Route =
  | { page: 'home' }
  | { page: 'book'; bookId: string }
  | { page: 'skills'; mode: TrainingMode }
  | { page: 'parent' }

function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '')
  const [page, value] = clean.split('/')
  if (page === 'book' && value) return { page: 'book', bookId: value }
  if (page === 'skills' && ['listening', 'reading', 'phonics', 'words', 'mixed'].includes(value)) {
    return { page: 'skills', mode: value as TrainingMode }
  }
  if (page === 'parent') return { page: 'parent' }
  return { page: 'home' }
}

function navigate(path: string) {
  window.location.hash = path
}

const BOOK_CENTER_FEATURES = [
  ['My Books', '我的绘本', '📚'],
  ['Continue Learning', '继续学习', '▶️'],
  ['Book Map', '绘本地图', '🗺️'],
  ['Vocabulary', '单词', '🧩'],
  ['Sentence Patterns', '句型', '💬'],
  ['Story Reading', '阅读', '📖'],
  ['Book Challenge', '挑战', '🏆'],
]

const SKILL_CARDS: [TrainingMode, string, string, string, string][] = [
  ['listening', 'Listening', '综合听力', '🎧', '#3b8dad'],
  ['reading', 'Reading', '跨绘本阅读', '📚', '#8a6ec5'],
  ['phonics', 'Phonics & Spelling', '拼读与拼写', '🔤', '#d47a4f'],
  ['words', 'Word Games', '认单词互动', '🎯', '#5b9a70'],
  ['mixed', 'Mixed Daily Training', '每日混合训练', '🚀', '#d65e69'],
]

function Home({
  books,
  progress,
  onProgress,
}: {
  books: Book[]
  progress: LearningProgress
  onProgress: (progress: LearningProgress) => void
}) {
  const [sound, setSound] = useState(true)
  const published = books.filter((book) => book.publishingStatus === 'published')
  const latestBook = useMemo(() => {
    const latest = Object.entries(progress.books).sort((left, right) => right[1].lastOpenedAt.localeCompare(left[1].lastOpenedAt))[0]
    return books.find((book) => book.id === latest?.[0]) ?? published[0]
  }, [books, progress.books, published])

  function openBook(book: Book) {
    onProgress(markBookStarted(progress, book.id))
    navigate(`/book/${book.id}`)
  }

  return (
    <main className="home-page">
      <header className="home-header">
        <button className="home-brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span>🌿</span><div><b>森林英语岛</b><small>Forest English Island</small></div>
        </button>
        <div>
          <button type="button" aria-label="切换声音" onClick={() => { const next = !sound; setSound(next); setSpeechEnabled(next) }}>{sound ? '🔊' : '🔇'}</button>
          <button className="star-counter" type="button">⭐ {progress.stars}</button>
          <button className="parent-entry" type="button" onClick={() => navigate('/parent')}>家长中心</button>
        </div>
      </header>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">BOOKS + SKILLS · 两个学习系统</span>
          <h1>从一本绘本出发，<br /><em>把英语真正用起来。</em></h1>
          <p>每本书独立完成单词、句型、阅读、理解、朗读和复习；再把三本已学内容带进综合听力、阅读和拼读训练。</p>
          {latestBook && (
            <button className="hero-continue" type="button" onClick={() => openBook(latestBook)}>
              <span>▶</span><div><b>{progress.books[latestBook.id] ? '继续学习' : '开始第一本绘本'}</b><small>{latestBook.cover} {latestBook.title}</small></div>
            </button>
          )}
          <div className="hero-stats">
            <span><b>{published.length}</b> 本已发布绘本</span>
            <span><b>{progress.learnedBookIds.length}</b> 本已开始</span>
            <span><b>{progress.difficultWords.length}</b> 个薄弱词待复习</span>
          </div>
        </div>
        <div className="hero-world" aria-label="原创森林学习场景">
          <span className="hero-cloud cloud-one">☁️</span>
          <span className="hero-cloud cloud-two">☁️</span>
          <span className="hero-sun">☀️</span>
          <span className="hero-tree tree-one">🌳</span>
          <span className="hero-tree tree-two">🌲</span>
          <span className="hero-fox">🦊</span>
          <span className="hero-book">📖</span>
          <div className="hero-bubble">Hello!<b>Choose a book.</b></div>
          <div className="hero-hill" />
        </div>
      </section>

      <section className="book-center center-section">
        <div className="center-heading">
          <div><small>BOOK LEARNING</small><h2>绘本学习中心</h2><p>每一本绘本都有固定六阶段学习路线。</p></div>
          <span>01</span>
        </div>
        <div className="feature-rail">
          {BOOK_CENTER_FEATURES.map(([english, chinese, icon]) => <span key={english}><i>{icon}</i><b>{english}</b><small>{chinese}</small></span>)}
        </div>
        <div className="book-grid">
          {published.map((book, index) => {
            const item = progress.books[book.id]
            const completed = item?.completedStages.length ?? 0
            return (
              <article className={`book-card book-tone-${index % 3}`} key={book.id}>
                <div className="book-cover">
                  {book.cover.startsWith('data:') || book.cover.startsWith('http') ? <img src={book.cover} alt="" /> : <span>{book.cover}</span>}
                  <i>{book.level}</i>
                </div>
                <div className="book-card-copy">
                  <small>BOOK {String(index + 1).padStart(2, '0')} · {book.suggestedDays} DAYS</small>
                  <h3>{book.title}</h3>
                  <p>{book.description}</p>
                  <div className="book-meta"><span>{book.pages.length} pages</span><span>{book.vocabulary.filter((word) => word.isCore).length} core words</span></div>
                  <div className="book-progress"><i><b style={{ width: `${(completed / 6) * 100}%` }} /></i><span>{completed}/6</span></div>
                  <button type="button" onClick={() => openBook(book)}>{item ? '继续这本绘本' : '开始学习'} →</button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="skills-center center-section">
        <div className="center-heading">
          <div><small>SKILLS TRAINING</small><h2>综合能力训练中心</h2><p>只读取 published 且孩子已经学习过的绘本，自动照顾薄弱词。</p></div>
          <span>02</span>
        </div>
        <div className="skill-grid">
          {SKILL_CARDS.map(([mode, title, zh, icon, color]) => (
            <button type="button" key={mode} style={{ '--skill-color': color } as React.CSSProperties} onClick={() => navigate(`/skills/${mode}`)}>
              <span>{icon}</span><div><b>{title}</b><small>{zh}</small></div><i>→</i>
            </button>
          ))}
        </div>
        <div className="smart-review-banner">
          <span>🧠</span>
          <div><b>整轮规划，不再临时随机</b><p>最近五题不重复答案、单词最多两次、类别与答案位置轮换、三本绘本尽量均衡。</p></div>
          <button type="button" onClick={() => navigate('/skills/mixed')}>开始今日训练</button>
        </div>
      </section>
      <footer>
        <button type="button" onClick={() => { speak('Welcome to Forest English Island.'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>🌿 Forest English Island</button>
        <p>原创场景 · 本地保存 · 手机 / iPad / 桌面浏览器</p>
        <button type="button" onClick={() => navigate('/parent')}>Parent Zone →</button>
      </footer>
    </main>
  )
}

export default function App() {
  const [books, setBooks] = useState<Book[]>(() => loadBooks())
  const [progress, setProgress] = useState<LearningProgress>(() => loadProgress())
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))

  useEffect(() => {
    const listener = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', listener)
    if (!window.location.hash) navigate('/')
    return () => window.removeEventListener('hashchange', listener)
  }, [])

  useEffect(() => saveBooks(books), [books])
  useEffect(() => saveProgress(progress), [progress])

  if (route.page === 'book') {
    const book = books.find((item) => item.id === route.bookId && item.publishingStatus === 'published')
    if (book) return <BookLearning book={book} progress={progress} onProgress={setProgress} onExit={() => navigate('/')} />
  }
  if (route.page === 'skills') {
    return <SkillsTraining initialMode={route.mode} books={books} progress={progress} onProgress={setProgress} onExit={() => navigate('/')} />
  }
  if (route.page === 'parent') {
    return (
      <ParentZone
        books={books}
        progress={progress}
        onBooksChange={setBooks}
        onResetProgress={() => setProgress(createProgress())}
        onExit={() => navigate('/')}
      />
    )
  }
  return <Home books={books} progress={progress} onProgress={setProgress} />
}
