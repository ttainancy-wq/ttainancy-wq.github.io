import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordingPanel } from './RecordingPanel'

class MockMediaRecorder {
  state: RecordingState = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onstop: (() => void) | null = null

  constructor(public stream: MediaStream) {}

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) } as BlobEvent)
    this.onstop?.()
  }
}

describe('RecordingPanel', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    })
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: MockMediaRecorder })
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:voice') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  })

  afterEach(() => vi.restoreAllMocks())

  it('can start, stop, expose playback and record another attempt', async () => {
    render(<RecordingPanel sentence="I can hear thunder." />)
    fireEvent.click(screen.getByRole('button', { name: /开始录音/ }))
    expect(await screen.findByRole('button', { name: /停止录音/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /停止录音/ }))
    await waitFor(() => expect(document.querySelector('audio')).toHaveAttribute('src', 'blob:voice'))
    expect(screen.getByRole('button', { name: /再录一次/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /标准答案/ })).toBeInTheDocument()
  })
})
