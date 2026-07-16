import { useEffect, useMemo, useState } from 'react'
import { deleteRecording, listRecordings, type StoredRecording } from '../lib/recordings'
import type { Book } from '../types/book'
import type { LearningProgress } from '../types/progress'
import { BookStudio } from './studio/BookStudio'

type ParentTab = 'progress' | 'difficult' | 'recordings' | 'studio' | 'transfer' | 'publish'

interface ParentZoneProps {
  books: Book[]
  progress: LearningProgress
  onBooksChange: (books: Book[]) => void
  onResetProgress: () => void
  onExit: () => void
}

const TABS: [ParentTab, string, string][] = [
  ['progress', 'Progress', '学习进度'],
  ['difficult', 'Difficult Words', '薄弱词'],
  ['recordings', 'Recordings', '录音'],
  ['studio', 'Book Studio', '绘本工作台'],
  ['transfer', 'Import / Export', '导入导出'],
  ['publish', 'Publish Books', '发布绘本'],
]

function ProgressPanel({ books, progress }: { books: Book[]; progress: LearningProgress }) {
  const practiced = Object.values(progress.words).filter((word) => word.exposureCount > 0)
  const mastered = practiced.filter((word) => word.masteryLevel >= 4)
  const totalAttempts = practiced.reduce((sum, word) => sum + word.exposureCount, 0)
  const correct = practiced.reduce((sum, word) => sum + word.listenCorrect + word.readingCorrect + word.spellingCorrect, 0)
  const incorrect = practiced.reduce((sum, word) => sum + word.listenIncorrect + word.readingIncorrect + word.spellingIncorrect, 0)
  const accuracy = correct + incorrect ? Math.round((correct / (correct + incorrect)) * 100) : 0
  const skillTotals = practiced.reduce(
    (totals, word) => ({
      listening: totals.listening + word.listenCorrect + word.listenIncorrect,
      reading: totals.reading + word.readingCorrect + word.readingIncorrect,
      spelling: totals.spelling + word.spellingCorrect + word.spellingIncorrect,
      speaking: totals.speaking + word.speakingAttempts,
    }),
    { listening: 0, reading: 0, spelling: 0, speaking: 0 },
  )

  return (
    <div className="parent-dashboard">
      <div className="metric-grid">
        <div><span>📚</span><b>{progress.learnedBookIds.length}</b><small>已学绘本</small></div>
        <div><span>🌱</span><b>{practiced.length}</b><small>练习单词</small></div>
        <div><span>🌟</span><b>{mastered.length}</b><small>已掌握单词</small></div>
        <div><span>🎯</span><b>{accuracy}%</b><small>综合正确率</small></div>
      </div>
      <div className="book-progress-grid">
        {books.filter((book) => book.publishingStatus === 'published').map((book) => {
          const item = progress.books[book.id]
          const completed = item?.completedStages.length ?? 0
          return (
            <section key={book.id}>
              <span>{book.cover}</span>
              <div>
                <h3>{book.title}</h3>
                <p>{item ? `当前 Stage ${item.currentStage} · Challenge ${item.challengeBest}/9` : '尚未开始'}</p>
                <i><b style={{ width: `${(completed / 6) * 100}%` }} /></i>
              </div>
              <strong>{completed}/6</strong>
            </section>
          )
        })}
      </div>
      <section className="skills-progress-panel">
        <div>
          <small>SKILLS TRAINING</small>
          <h3>综合能力训练</h3>
          <p>与上方绘本六阶段进度分开统计。</p>
        </div>
        <span><i>🎧</i><b>{skillTotals.listening}</b><small>听力尝试</small></span>
        <span><i>📚</i><b>{skillTotals.reading}</b><small>阅读尝试</small></span>
        <span><i>🔤</i><b>{skillTotals.spelling}</b><small>拼读尝试</small></span>
        <span><i>🎙️</i><b>{skillTotals.speaking}</b><small>口语尝试</small></span>
      </section>
      <section className="parent-note">
        <h3>最近学习</h3>
        <p>累计练习 {totalAttempts} 次。本页分别显示绘本学习和综合能力训练数据，刷新后仍会保留。</p>
      </section>
    </div>
  )
}

function DifficultPanel({ books, progress }: { books: Book[]; progress: LearningProgress }) {
  const words = books.flatMap((book) => book.vocabulary.map((word) => ({ ...word, book })))
  const difficult = progress.difficultWords
    .map((id) => ({ word: words.find((item) => item.id === id), data: progress.words[id] }))
    .filter((item) => item.word && item.data)
  return (
    <div className="difficult-panel">
      <div className="parent-section-heading">
        <div><small>SMART REVIEW</small><h2>薄弱词和下次复习</h2></div>
        <span>{difficult.length} words</span>
      </div>
      {difficult.length ? difficult.map(({ word, data }) => word && data && (
        <section key={word.id}>
          <span>{word.image}</span>
          <div><h3>{word.word}</h3><p>{word.meaning} · {word.book.title}</p></div>
          <div><b>听错 {data.listenIncorrect}</b><b>读错 {data.readingIncorrect}</b><b>拼错 {data.spellingIncorrect}</b></div>
          <small>下次：{new Date(data.nextReviewAt).toLocaleString()}</small>
        </section>
      )) : <div className="empty-state"><span>🌿</span><h2>暂时没有薄弱词</h2><p>答错的词会自动加入，并按间隔复习。</p></div>}
    </div>
  )
}

function RecordingsPanel() {
  const [recordings, setRecordings] = useState<StoredRecording[]>([])
  const urls = useMemo(() => new Map(recordings.map((recording) => [recording.meta.id, URL.createObjectURL(recording.blob)])), [recordings])

  useEffect(() => {
    void listRecordings().then(setRecordings)
  }, [])

  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls])

  return (
    <div className="recordings-panel">
      <div className="parent-section-heading"><div><small>SPEAKING ARCHIVE</small><h2>孩子的录音</h2></div><span>{recordings.length} files</span></div>
      {recordings.length ? recordings.map((recording) => (
        <section key={recording.meta.id}>
          <span>{recording.meta.isBest ? '⭐' : '🎙️'}</span>
          <div><b>{recording.meta.sentence}</b><small>{new Date(recording.meta.createdAt).toLocaleString()}</small></div>
          <audio controls src={urls.get(recording.meta.id)}><track kind="captions" /></audio>
          <button type="button" onClick={() => void deleteRecording(recording.meta.id).then(() => setRecordings(recordings.filter((item) => item.meta.id !== recording.meta.id)))}>删除</button>
        </section>
      )) : <div className="empty-state"><span>🎙️</span><h2>还没有保存录音</h2><p>在绘本朗读或综合听力中点击“保存”后会显示在这里。</p></div>}
    </div>
  )
}

function PublishPanel({ books, onBooksChange }: { books: Book[]; onBooksChange: (books: Book[]) => void }) {
  return (
    <div className="publish-panel">
      <div className="parent-section-heading"><div><small>CHILD LIBRARY CONTROL</small><h2>发布与取消发布</h2></div><span>{books.filter((book) => book.publishingStatus === 'published').length} published</span></div>
      {books.map((book) => (
        <section key={book.id}>
          <span>{book.cover}</span>
          <div><h3>{book.title}</h3><p>{book.pages.length} pages · {book.vocabulary.length} words · {book.level}</p></div>
          <b className={book.publishingStatus}>{book.publishingStatus}</b>
          <button type="button" onClick={() => onBooksChange(books.map((item) => item.id === book.id ? { ...item, publishingStatus: item.publishingStatus === 'published' ? 'draft' : 'published' } : item))}>
            {book.publishingStatus === 'published' ? '取消发布' : '发布'}
          </button>
        </section>
      ))}
    </div>
  )
}

export function ParentZone({
  books,
  progress,
  onBooksChange,
  onResetProgress,
  onExit,
}: ParentZoneProps) {
  const [tab, setTab] = useState<ParentTab>('progress')
  return (
    <main className="parent-zone page-shell">
      <header className="parent-header">
        <button type="button" onClick={onExit}>← 返回儿童首页</button>
        <div><span>🌿</span><b>Parent Zone · 家长中心</b></div>
        <button type="button" onClick={onResetProgress}>重置学习记录</button>
      </header>
      <nav className="parent-tabs">
        {TABS.map(([key, english, chinese]) => (
          <button className={tab === key ? 'active' : ''} type="button" key={key} onClick={() => setTab(key)}>
            <b>{english}</b><small>{chinese}</small>
          </button>
        ))}
      </nav>
      <section className={`parent-body ${tab === 'studio' || tab === 'transfer' ? 'wide' : ''}`}>
        {tab === 'progress' && <ProgressPanel books={books} progress={progress} />}
        {tab === 'difficult' && <DifficultPanel books={books} progress={progress} />}
        {tab === 'recordings' && <RecordingsPanel />}
        {tab === 'studio' && <BookStudio books={books} onBooksChange={onBooksChange} />}
        {tab === 'transfer' && <BookStudio books={books} onBooksChange={onBooksChange} initialSection="preview" />}
        {tab === 'publish' && <PublishPanel books={books} onBooksChange={onBooksChange} />}
      </section>
    </main>
  )
}
