let speechEnabled = true
let activeAudio: HTMLAudioElement | null = null

export type SpeechStyle = 'story' | 'word' | 'question' | 'celebration'

interface SpeechOptions {
  rate?: number
  style?: SpeechStyle
  onBoundary?: (index: number) => void
}

const VOICE_PRIORITY = [
  'ava',
  'samantha',
  'zoe',
  'allison',
  'jenny online',
  'aria online',
  'sonia online',
  'google us english',
  'google uk english female',
  'siri',
]

function voiceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  if (!lang.startsWith('en')) return -1000
  let score = lang === 'en-us' ? 80 : lang.startsWith('en-gb') ? 70 : 60
  const priority = VOICE_PRIORITY.findIndex((candidate) => name.includes(candidate))
  if (priority >= 0) score += 120 - priority * 7
  if (/premium|enhanced|natural|neural|online/.test(name)) score += 30
  if (/compact|novelty|whisper|zarvox|bad news|good news/.test(name)) score -= 90
  if (voice.localService) score += 4
  return score
}

export function selectBestEnglishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  return voices
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'))
    .sort((left, right) => voiceScore(right) - voiceScore(left))[0]
}

export function setSpeechEnabled(enabled: boolean): void {
  speechEnabled = enabled
  if (!enabled) {
    activeAudio?.pause()
    activeAudio = null
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }
}

function speechOptions(
  rateOrOptions: number | SpeechOptions,
  onBoundary?: (index: number) => void,
): Required<Pick<SpeechOptions, 'rate' | 'style'>> & Pick<SpeechOptions, 'onBoundary'> {
  if (typeof rateOrOptions === 'number') {
    return { rate: rateOrOptions, style: 'story', onBoundary }
  }
  return {
    rate: rateOrOptions.rate ?? 0.82,
    style: rateOrOptions.style ?? 'story',
    onBoundary: rateOrOptions.onBoundary,
  }
}

export function speak(
  text: string,
  rateOrOptions: number | SpeechOptions = { rate: 0.82, style: 'story' },
  legacyBoundary?: (index: number) => void,
): void {
  if (!speechEnabled || !text || !('speechSynthesis' in window)) return
  const options = speechOptions(rateOrOptions, legacyBoundary)
  activeAudio?.pause()
  activeAudio = null
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = Math.max(0.5, Math.min(1.05, options.rate))
  utterance.pitch = options.style === 'celebration' ? 1.12 : options.style === 'word' ? 1.02 : 1.06
  utterance.volume = 1
  utterance.voice = selectBestEnglishVoice(window.speechSynthesis.getVoices()) ?? null
  utterance.onboundary = (event) => options.onBoundary?.(event.charIndex)
  window.speechSynthesis.speak(utterance)
}

/** Play a teacher-provided recording when available, otherwise use the best device voice. */
export function playNarration(
  text: string,
  audio: string,
  options: SpeechOptions = {},
): void {
  if (!speechEnabled) return
  if (!audio.trim()) {
    speak(text, { ...options, style: options.style ?? 'story' })
    return
  }

  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  activeAudio?.pause()
  const recording = new Audio(audio)
  activeAudio = recording
  recording.playbackRate = (options.rate ?? 1) < 0.75 ? 0.78 : 1
  recording.onended = () => { activeAudio = null }
  void recording.play().catch(() => {
    activeAudio = null
    speak(text, { ...options, style: options.style ?? 'story' })
  })
}
