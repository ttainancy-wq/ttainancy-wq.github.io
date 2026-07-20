import { useEffect, useRef, useState } from 'react'
import { cloneBookTemplate } from '../../data/books'
import { validateBook, type ValidationResult } from '../../lib/bookValidator'
import { playNarration } from '../../lib/speech'
import type {
  Book,
  BookPage,
  ComprehensionQuestion,
  SentencePattern,
  VocabularyItem,
} from '../../types/book'
import { SceneArt } from '../SceneArt'

type StudioSection = 'basic' | 'pages' | 'vocabulary' | 'patterns' | 'questions' | 'reading' | 'preview'

interface BookEditorProps {
  books: Book[]
  onBooksChange: (books: Book[]) => void
  initialSection?: StudioSection
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function downloadJson(book: Book): void {
  const blob = new Blob([JSON.stringify(book, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${book.id || 'book'}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

export function BookImporter({ onImport }: { onImport: (book: Book) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  async function importFile(file?: File) {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as Book
      const result = validateBook(parsed)
      if (!result.valid) {
        setMessage(`导入失败：${result.errors[0]}`)
        return
      }
      onImport(parsed)
      setMessage(`已导入 ${parsed.title}`)
    } catch {
      setMessage('JSON 无法解析，请检查文件格式。')
    }
  }

  return (
    <div className="studio-utility">
      <input ref={inputRef} hidden type="file" accept=".json,application/json" onChange={(event) => void importFile(event.target.files?.[0])} />
      <button type="button" onClick={() => inputRef.current?.click()}>⬆️ 导入 JSON</button>
      {message && <small>{message}</small>}
    </div>
  )
}

export function BookExporter({ book }: { book: Book }) {
  return (
    <div className="studio-utility">
      <button type="button" onClick={() => downloadJson(book)}>⬇️ 导出 JSON</button>
      <small>导出的文件可作为备份或下周新书模板。</small>
    </div>
  )
}

export function BookValidatorPanel({ book }: { book: Book }) {
  const [result, setResult] = useState<ValidationResult | null>(null)
  return (
    <div className="validator-panel">
      <button type="button" onClick={() => setResult(validateBook(book))}>✓ 校验完整性</button>
      {result && (
        <div className={result.valid ? 'validation-pass' : 'validation-fail'}>
          <b>{result.valid ? '可以发布' : `发现 ${result.errors.length} 个错误`}</b>
          {result.errors.map((error) => <p key={error}>• {error}</p>)}
          {result.warnings.map((warning) => <p key={warning}>△ {warning}</p>)}
        </div>
      )}
    </div>
  )
}

export function PageEditor({
  pages,
  onChange,
}: {
  pages: BookPage[]
  onChange: (pages: BookPage[]) => void
}) {
  const [selected, setSelected] = useState(0)
  const [audioMessage, setAudioMessage] = useState('')
  const page = pages[selected]

  function update(patch: Partial<BookPage>) {
    onChange(pages.map((item, index) => index === selected ? { ...item, ...patch } : item))
  }

  function move(direction: -1 | 1) {
    const target = selected + direction
    if (target < 0 || target >= pages.length) return
    const copy = [...pages]
    ;[copy[selected], copy[target]] = [copy[target], copy[selected]]
    onChange(copy)
    setSelected(target)
  }

  function addPage() {
    const next: BookPage = {
      id: makeId('page'),
      image: '🌳|🐾|☀️',
      text: 'Write a new story sentence.',
      optionalTranslation: '',
      audio: '',
      focusWords: [],
      focusPattern: '',
      questions: [],
    }
    onChange([...pages, next])
    setSelected(pages.length)
  }

  if (!page) {
    return <button type="button" onClick={addPage}>+ 添加第一页</button>
  }

  return (
    <div className="page-editor editor-grid">
      <aside>
        <button type="button" onClick={addPage}>+ 添加页面</button>
        {pages.map((item, index) => (
          <button className={selected === index ? 'active' : ''} type="button" key={item.id} onClick={() => setSelected(index)}>
            {index + 1}. {item.text.slice(0, 24)}
          </button>
        ))}
      </aside>
      <section>
        <div className="editor-toolbar">
          <button type="button" disabled={selected === 0} onClick={() => move(-1)}>↑ 前移</button>
          <button type="button" disabled={selected === pages.length - 1} onClick={() => move(1)}>↓ 后移</button>
          <button type="button" className="danger" onClick={() => {
            onChange(pages.filter((_, index) => index !== selected))
            setSelected(Math.max(0, selected - 1))
          }}>删除页面</button>
        </div>
        <label>页面 ID<input value={page.id} onChange={(event) => update({ id: event.target.value })} /></label>
        <label>原创场景（可用 emoji，以 | 分隔）
          <input value={page.image} onChange={(event) => update({ image: event.target.value })} />
        </label>
        <label>或上传页面图片
          <input type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void readImage(file).then((image) => update({ image }))
          }} />
        </label>
        <label>页面英文<textarea rows={3} value={page.text} onChange={(event) => update({ text: event.target.value })} /></label>
        <label>可选中文<textarea rows={2} value={page.optionalTranslation ?? ''} onChange={(event) => update({ optionalTranslation: event.target.value })} /></label>
        <label>真人朗读音频 URL（没有可留空，自动使用设备清晰英语音色）
          <input
            value={page.audio.startsWith('data:') ? '' : page.audio}
            placeholder={page.audio.startsWith('data:') ? '已导入本地音频文件' : 'https://.../page-audio.mp3'}
            onChange={(event) => update({ audio: event.target.value })}
          />
        </label>
        <label>或导入你有权使用的原版 / 真人录音（每段不超过 500 KB；较大文件请使用音频 URL）
          <input type="file" accept="audio/*" onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            if (file.size > 500 * 1024) {
              setAudioMessage('音频超过 500 KB，建议先压缩或改用音频 URL，避免浏览器本地空间不足。')
              return
            }
            void readImage(file).then((audio) => {
              update({ audio })
              setAudioMessage(`已导入：${file.name}`)
            })
          }} />
        </label>
        <div className="audio-editor-actions">
          <button type="button" disabled={!page.audio} onClick={() => playNarration(page.text, page.audio)}>▶ 试听页面朗读</button>
          <button type="button" disabled={!page.audio} onClick={() => { update({ audio: '' }); setAudioMessage('已移除页面音频，将使用设备英语音色。') }}>移除音频</button>
          {audioMessage && <small>{audioMessage}</small>}
        </div>
        <label>重点单词 ID（逗号分隔）
          <input value={page.focusWords.join(', ')} onChange={(event) => update({ focusWords: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
        </label>
        <label>重点句型 ID<input value={page.focusPattern} onChange={(event) => update({ focusPattern: event.target.value })} /></label>
        {page.image.startsWith('data:') ? <img className="uploaded-preview" src={page.image} alt="页面预览" /> : <SceneArt compact scene={page.image} label={page.text} />}
      </section>
    </div>
  )
}

function newVocabulary(): VocabularyItem {
  return {
    id: makeId('word'),
    word: 'word',
    meaning: '释义',
    category: 'animal',
    image: '🐾',
    audio: '',
    phonics: 'w-or-d',
    syllables: ['word'],
    exampleSentences: ['Put the word in a sentence.'],
    distractors: ['choice-a', 'choice-b', 'choice-c'],
    isCore: true,
  }
}

export function VocabularyEditor({
  vocabulary,
  onChange,
}: {
  vocabulary: VocabularyItem[]
  onChange: (vocabulary: VocabularyItem[]) => void
}) {
  const [selected, setSelected] = useState(0)
  const word = vocabulary[selected]

  function update(patch: Partial<VocabularyItem>) {
    onChange(vocabulary.map((item, index) => index === selected ? { ...item, ...patch } : item))
  }

  if (!word) {
    return <button type="button" onClick={() => onChange([newVocabulary()])}>+ 添加第一个单词</button>
  }

  return (
    <div className="editor-grid vocabulary-editor">
      <aside>
        <button type="button" onClick={() => { onChange([...vocabulary, newVocabulary()]); setSelected(vocabulary.length) }}>+ 添加单词</button>
        {vocabulary.map((item, index) => (
          <button className={selected === index ? 'active' : ''} type="button" key={`${item.id}-${index}`} onClick={() => setSelected(index)}>
            {item.image} {item.word}
          </button>
        ))}
      </aside>
      <section>
        <div className="editor-toolbar">
          <label className="checkbox-label"><input type="checkbox" checked={word.isCore} onChange={(event) => update({ isCore: event.target.checked })} />核心词</label>
          <button className="danger" type="button" onClick={() => {
            onChange(vocabulary.filter((_, index) => index !== selected))
            setSelected(Math.max(0, selected - 1))
          }}>删除</button>
        </div>
        <div className="form-columns">
          <label>ID<input value={word.id} onChange={(event) => update({ id: event.target.value })} /></label>
          <label>Word<input value={word.word} onChange={(event) => update({ word: event.target.value.toLowerCase() })} /></label>
          <label>Meaning<input value={word.meaning} onChange={(event) => update({ meaning: event.target.value })} /></label>
          <label>Category<input value={word.category} onChange={(event) => update({ category: event.target.value })} /></label>
          <label>Image / emoji<input value={word.image} onChange={(event) => update({ image: event.target.value })} /></label>
          <label>Phonics<input value={word.phonics} onChange={(event) => update({ phonics: event.target.value })} /></label>
        </div>
        <label>Syllables（逗号分隔）<input value={word.syllables.join(', ')} onChange={(event) => update({ syllables: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
        <label>Example sentences（每行一句）
          <textarea rows={4} value={word.exampleSentences.join('\n')} onChange={(event) => update({ exampleSentences: event.target.value.split('\n').filter(Boolean) })} />
        </label>
        <label>Distractors（逗号分隔）<input value={word.distractors.join(', ')} onChange={(event) => update({ distractors: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
      </section>
    </div>
  )
}

function newPattern(): SentencePattern {
  return {
    id: makeId('pattern'),
    pattern: 'I see a {color} {animal}.',
    slots: ['color', 'animal'],
    replacements: { color: ['brown', 'red'], animal: ['bear', 'bird'] },
    questionForms: ['What do you see?'],
    answerForms: ['I see a {color} {animal}.'],
    levels: ['I see a {animal}.', 'I see a {color} {animal}.'],
    examples: ['I see a brown bear.'],
  }
}

export function SentencePatternEditor({
  patterns,
  onChange,
}: {
  patterns: SentencePattern[]
  onChange: (patterns: SentencePattern[]) => void
}) {
  const [selected, setSelected] = useState(0)
  const pattern = patterns[selected]
  function update(patch: Partial<SentencePattern>) {
    onChange(patterns.map((item, index) => index === selected ? { ...item, ...patch } : item))
  }
  if (!pattern) return <button type="button" onClick={() => onChange([newPattern()])}>+ 添加第一个句型</button>
  return (
    <div className="editor-grid pattern-editor">
      <aside>
        <button type="button" onClick={() => { onChange([...patterns, newPattern()]); setSelected(patterns.length) }}>+ 添加句型</button>
        {patterns.map((item, index) => <button className={selected === index ? 'active' : ''} type="button" key={`${item.id}-${index}`} onClick={() => setSelected(index)}>{item.id}</button>)}
      </aside>
      <section>
        <div className="editor-toolbar"><button className="danger" type="button" onClick={() => onChange(patterns.filter((_, index) => index !== selected))}>删除句型</button></div>
        <label>ID<input value={pattern.id} onChange={(event) => update({ id: event.target.value })} /></label>
        <label>Pattern<input value={pattern.pattern} onChange={(event) => update({ pattern: event.target.value })} /></label>
        <label>Slots（逗号分隔）
          <input value={pattern.slots.join(', ')} onChange={(event) => {
            const slots = event.target.value.split(',').map((item) => item.trim()).filter(Boolean)
            update({ slots, replacements: Object.fromEntries(slots.map((slot) => [slot, pattern.replacements[slot] ?? []])) })
          }} />
        </label>
        <div className="slot-editors">
          {pattern.slots.map((slot) => (
            <label key={slot}>{slot} replacements
              <input value={(pattern.replacements[slot] ?? []).join(', ')} onChange={(event) => update({ replacements: { ...pattern.replacements, [slot]: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) } })} />
            </label>
          ))}
        </div>
        <label>Question forms（每行一个）<textarea rows={3} value={pattern.questionForms.join('\n')} onChange={(event) => update({ questionForms: event.target.value.split('\n').filter(Boolean) })} /></label>
        <label>Answer forms（每行一个）<textarea rows={3} value={pattern.answerForms.join('\n')} onChange={(event) => update({ answerForms: event.target.value.split('\n').filter(Boolean) })} /></label>
        <label>Levels（每行一个）<textarea rows={4} value={pattern.levels.join('\n')} onChange={(event) => update({ levels: event.target.value.split('\n').filter(Boolean) })} /></label>
        <label>Examples（每行一个）<textarea rows={3} value={pattern.examples.join('\n')} onChange={(event) => update({ examples: event.target.value.split('\n').filter(Boolean) })} /></label>
      </section>
    </div>
  )
}

function newQuestion(): ComprehensionQuestion {
  return {
    id: makeId('question'),
    type: 'what',
    prompt: 'Add one question from the book.',
    answers: ['answer'],
    choices: [],
  }
}

export function QuestionEditor({
  questions,
  onChange,
}: {
  questions: ComprehensionQuestion[]
  onChange: (questions: ComprehensionQuestion[]) => void
}) {
  const [selected, setSelected] = useState(0)
  const question = questions[selected]
  function update(patch: Partial<ComprehensionQuestion>) {
    onChange(questions.map((item, index) => index === selected ? { ...item, ...patch } : item))
  }
  if (!question) return <button type="button" onClick={() => onChange([newQuestion()])}>+ 添加第一个问题</button>
  return (
    <div className="editor-grid question-editor">
      <aside>
        <button type="button" onClick={() => { onChange([...questions, newQuestion()]); setSelected(questions.length) }}>+ 添加问题</button>
        {questions.map((item, index) => <button className={selected === index ? 'active' : ''} type="button" key={`${item.id}-${index}`} onClick={() => setSelected(index)}>{index + 1}. {item.prompt.slice(0, 20)}</button>)}
      </aside>
      <section>
        <div className="editor-toolbar"><button className="danger" type="button" onClick={() => onChange(questions.filter((_, index) => index !== selected))}>删除问题</button></div>
        <label>ID<input value={question.id} onChange={(event) => update({ id: event.target.value })} /></label>
        <label>Type
          <select value={question.type} onChange={(event) => update({ type: event.target.value as ComprehensionQuestion['type'] })}>
            {['picture', 'yes-no', 'word', 'short-answer', 'sequence', 'who', 'what', 'where', 'recording'].map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>Prompt<textarea rows={3} value={question.prompt} onChange={(event) => update({ prompt: event.target.value })} /></label>
        <label>Answers（逗号分隔）<input value={question.answers.join(', ')} onChange={(event) => update({ answers: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
        <label>Choices（逗号分隔）<input value={question.choices?.join(', ') ?? ''} onChange={(event) => update({ choices: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
      </section>
    </div>
  )
}

export function BookPreview({ book }: { book: Book }) {
  const [page, setPage] = useState(0)
  const current = book.pages[page]
  return (
    <div className="book-preview">
      <header><span>{book.cover}</span><div><h2>{book.title}</h2><p>{book.description}</p></div></header>
      {current ? (
        <>
          {current.image.startsWith('data:') ? <img src={current.image} alt={current.text} /> : <SceneArt scene={current.image} label={current.text} />}
          <h3>{current.text}</h3>
          <p>{current.optionalTranslation}</p>
          <button type="button" onClick={() => playNarration(current.text, current.audio)}>🔊 试听朗读</button>
          <div className="page-navigation">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>←</button>
            <b>{page + 1}/{book.pages.length}</b>
            <button type="button" disabled={page === book.pages.length - 1} onClick={() => setPage(page + 1)}>→</button>
          </div>
        </>
      ) : <p>请先添加页面。</p>}
    </div>
  )
}

export function BookEditor({ books, onBooksChange, initialSection = 'basic' }: BookEditorProps) {
  const [selectedId, setSelectedId] = useState(books[0]?.id ?? '')
  const [section, setSection] = useState<StudioSection>(initialSection)
  const [savedMessage, setSavedMessage] = useState('')
  const selected = books.find((book) => book.id === selectedId) ?? books[0]
  const [draft, setDraft] = useState<Book>(() => structuredClone(selected ?? cloneBookTemplate()))

  useEffect(() => {
    const next = books.find((book) => book.id === selectedId) ?? books[0]
    if (next) setDraft(structuredClone(next))
  }, [books, selectedId])

  function save(status?: Book['publishingStatus']) {
    const next = { ...draft, publishingStatus: status ?? draft.publishingStatus }
    const existing = books.some((book) => book.id === next.id)
    onBooksChange(existing ? books.map((book) => book.id === selectedId ? next : book) : [...books, next])
    setSelectedId(next.id)
    setDraft(next)
    setSavedMessage(status === 'published' ? '已发布到儿童端' : '草稿已保存到本机')
    window.setTimeout(() => setSavedMessage(''), 1800)
  }

  function createBook() {
    const template = cloneBookTemplate()
    template.id = makeId('book')
    template.title = 'New Book'
    setDraft(template)
    setSelectedId(template.id)
    setSection('basic')
  }

  function duplicateBook() {
    const copy = structuredClone(draft)
    copy.id = `${draft.id}-copy-${Date.now().toString().slice(-4)}`
    copy.title = `${draft.title} Copy`
    copy.publishingStatus = 'draft'
    setDraft(copy)
    setSelectedId(copy.id)
    setSection('basic')
  }

  function importBook(book: Book) {
    const exists = books.some((item) => item.id === book.id)
    onBooksChange(exists ? books.map((item) => item.id === book.id ? book : item) : [...books, book])
    setSelectedId(book.id)
    setDraft(structuredClone(book))
  }

  return (
    <div className="book-studio">
      <div className="studio-topbar">
        <div>
          <small>LOCAL-FIRST CONTENT SYSTEM</small>
          <h1>Book Studio · 绘本工作台</h1>
          <p>创建、复制、录入、校验、预览并发布绘本，不需要重新开发页面。</p>
        </div>
        <div className="studio-top-actions">
          <button type="button" onClick={createBook}>＋ 创建新绘本</button>
          <button type="button" onClick={duplicateBook}>⧉ 复制为模板</button>
          <button type="button" onClick={() => save('draft')}>💾 保存草稿</button>
          <button className="publish-button" type="button" onClick={() => {
            const result = validateBook(draft)
            if (result.valid) save('published')
            else setSavedMessage(`发布前请修复：${result.errors[0]}`)
          }}>🚀 发布</button>
        </div>
      </div>
      {savedMessage && <p className="studio-message">{savedMessage}</p>}
      <div className="studio-layout">
        <aside className="book-list">
          <b>绘本库</b>
          {books.map((book) => (
            <button className={selectedId === book.id ? 'active' : ''} type="button" key={book.id} onClick={() => setSelectedId(book.id)}>
              <span>{book.cover}</span>
              <div><b>{book.title}</b><small>{book.publishingStatus}</small></div>
            </button>
          ))}
          {!books.some((book) => book.id === draft.id) && (
            <button className="active" type="button"><span>{draft.cover}</span><div><b>{draft.title}</b><small>unsaved</small></div></button>
          )}
          <BookImporter onImport={importBook} />
          <BookExporter book={draft} />
          <BookValidatorPanel book={draft} />
        </aside>
        <main className="studio-editor">
          <nav className="studio-tabs">
            {([
              ['basic', '基本信息'],
              ['pages', '页面'],
              ['vocabulary', '重点单词'],
              ['patterns', '重点句型'],
              ['questions', '理解问题'],
              ['reading', '扩展与拼读'],
              ['preview', '儿童端预览'],
            ] as [StudioSection, string][]).map(([key, label]) => (
              <button className={section === key ? 'active' : ''} type="button" key={key} onClick={() => setSection(key)}>{label}</button>
            ))}
          </nav>
          {section === 'basic' && (
            <section className="basic-editor">
              <div className="form-columns">
                <label>ID<input value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value })} /></label>
                <label>Title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
                <label>Author<input value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} /></label>
                <label>Theme<input value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value })} /></label>
                <label>Level
                  <select value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value as Book['level'] })}>
                    {['starter', 'level-1', 'level-2', 'level-3'].map((level) => <option key={level}>{level}</option>)}
                  </select>
                </label>
                <label>Suggested days<input type="number" min="1" value={draft.suggestedDays} onChange={(event) => setDraft({ ...draft, suggestedDays: Number(event.target.value) })} /></label>
              </div>
              <label>Description<textarea rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <label>Cover emoji / image URL<input value={draft.cover} onChange={(event) => setDraft({ ...draft, cover: event.target.value })} /></label>
              <label>上传封面
                <input type="file" accept="image/*" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void readImage(file).then((cover) => setDraft({ ...draft, cover }))
                }} />
              </label>
              <label>Status
                <select value={draft.publishingStatus} onChange={(event) => setDraft({ ...draft, publishingStatus: event.target.value as Book['publishingStatus'] })}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </label>
            </section>
          )}
          {section === 'pages' && <PageEditor pages={draft.pages} onChange={(pages) => setDraft({ ...draft, pages })} />}
          {section === 'vocabulary' && <VocabularyEditor vocabulary={draft.vocabulary} onChange={(vocabulary) => setDraft({ ...draft, vocabulary })} />}
          {section === 'patterns' && <SentencePatternEditor patterns={draft.sentencePatterns} onChange={(sentencePatterns) => setDraft({ ...draft, sentencePatterns })} />}
          {section === 'questions' && <QuestionEditor questions={draft.comprehensionQuestions} onChange={(comprehensionQuestions) => setDraft({ ...draft, comprehensionQuestions })} />}
          {section === 'reading' && (
            <section className="basic-editor">
              <label>Phonics targets（逗号分隔）
                <input value={draft.phonicsTargets.join(', ')} onChange={(event) => setDraft({ ...draft, phonicsTargets: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
              </label>
              <label>Reading extension title
                <input value={draft.readingExtensions[0]?.title ?? ''} onChange={(event) => {
                  const reading = draft.readingExtensions[0] ?? { id: makeId('reading'), title: '', sentences: [], questions: [] }
                  setDraft({ ...draft, readingExtensions: [{ ...reading, title: event.target.value }, ...draft.readingExtensions.slice(1)] })
                }} />
              </label>
              <label>Reading sentences（每行一句）
                <textarea rows={7} value={draft.readingExtensions[0]?.sentences.join('\n') ?? ''} onChange={(event) => {
                  const reading = draft.readingExtensions[0] ?? { id: makeId('reading'), title: 'Extension', sentences: [], questions: [] }
                  setDraft({ ...draft, readingExtensions: [{ ...reading, sentences: event.target.value.split('\n').filter(Boolean) }, ...draft.readingExtensions.slice(1)] })
                }} />
              </label>
              <div className="reward-editor">
                <label>Reward badge<input value={draft.rewards.badge} onChange={(event) => setDraft({ ...draft, rewards: { ...draft.rewards, badge: event.target.value } })} /></label>
                <label>Reward stars<input type="number" value={draft.rewards.stars} onChange={(event) => setDraft({ ...draft, rewards: { ...draft.rewards, stars: Number(event.target.value) } })} /></label>
                <label>Reward message<input value={draft.rewards.message} onChange={(event) => setDraft({ ...draft, rewards: { ...draft.rewards, message: event.target.value } })} /></label>
              </div>
            </section>
          )}
          {section === 'preview' && <BookPreview book={draft} />}
        </main>
      </div>
    </div>
  )
}

export function BookStudio(props: BookEditorProps) {
  return <BookEditor {...props} />
}
