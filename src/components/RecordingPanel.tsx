import { useEffect, useRef, useState } from 'react'
import { saveRecording } from '../lib/recordings'
import { speak } from '../lib/speech'

interface RecordingPanelProps {
  sentence: string
  bookId?: string
  pageId?: string
  wordId?: string
  onAttempt?: () => void
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `recording-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function RecordingPanel({
  sentence,
  bookId,
  pageId,
  wordId,
  onAttempt,
}: RecordingPanelProps) {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef(0)
  const chunksRef = useRef<Blob[]>([])
  const [status, setStatus] = useState<'idle' | 'recording' | 'ready' | 'saved' | 'unsupported'>('idle')
  const [audioUrl, setAudioUrl] = useState('')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    },
    [audioUrl],
  )

  async function start() {
    setMessage('')
    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) {
      setStatus('unsupported')
      setMessage('当前浏览器不支持录音，请使用新版 Safari、Chrome 或 Edge。')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      streamRef.current = stream
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const nextBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setBlob(nextBlob)
        setAudioUrl(URL.createObjectURL(nextBlob))
        setDuration(Date.now() - startedAtRef.current)
        setStatus('ready')
        stream.getTracks().forEach((track) => track.stop())
      }
      startedAtRef.current = Date.now()
      recorder.start()
      setStatus('recording')
      onAttempt?.()
    } catch {
      setStatus('idle')
      setMessage('没有获得麦克风权限。请允许录音后再试一次。')
    }
  }

  function stop() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  async function save(isBest = false) {
    if (!blob) return
    try {
      await saveRecording({
        meta: {
          id: makeId(),
          bookId,
          pageId,
          wordId,
          sentence,
          createdAt: new Date().toISOString(),
          durationMs: duration,
          isBest,
        },
        blob,
      })
      setStatus('saved')
      setMessage(isBest ? '最佳录音已保存 ⭐' : '录音已保存')
    } catch {
      setMessage('录音保存失败，请检查浏览器存储权限。')
    }
  }

  return (
    <section className="recording-panel" aria-label="录音练习">
      <div>
        <span className={`record-dot ${status === 'recording' ? 'active' : ''}`} />
        <b>Recording answer</b>
        <small>可用单词、短语或完整句回答</small>
      </div>
      <p>{sentence}</p>
      <div className="record-actions">
        {status !== 'recording' ? (
          <button className="record-button" type="button" onClick={start}>
            🎙️ {status === 'ready' || status === 'saved' ? '再录一次' : '开始录音'}
          </button>
        ) : (
          <button className="stop-button" type="button" onClick={stop}>
            ⏹ 停止录音
          </button>
        )}
        <button type="button" onClick={() => speak(sentence, 0.78)}>
          🔊 标准答案
        </button>
        {audioUrl && (
          <audio className="audio-playback" controls src={audioUrl}>
            <track kind="captions" />
          </audio>
        )}
        {blob && (
          <>
            <button type="button" onClick={() => void save(false)}>
              💾 保存
            </button>
            <button type="button" onClick={() => void save(true)}>
              ⭐ 保存最佳
            </button>
          </>
        )}
      </div>
      {message && <p className="inline-message">{message}</p>}
    </section>
  )
}
