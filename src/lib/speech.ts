let speechEnabled = true

export function setSpeechEnabled(enabled: boolean): void {
  speechEnabled = enabled
  if (!enabled && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

export function speak(text: string, rate = 0.88, onBoundary?: (index: number) => void): void {
  if (!speechEnabled || !text || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = rate
  utterance.pitch = 1.04
  utterance.onboundary = (event) => onBoundary?.(event.charIndex)
  window.speechSynthesis.speak(utterance)
}
