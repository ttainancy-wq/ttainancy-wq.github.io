import { describe, expect, it } from 'vitest'
import { selectBestEnglishVoice } from './speech'

function voice(name: string, lang: string, localService = true): SpeechSynthesisVoice {
  return { name, lang, localService, default: false, voiceURI: name }
}

describe('clear English voice selection', () => {
  it('prefers a natural English voice and never selects a non-English fallback', () => {
    const selected = selectBestEnglishVoice([
      voice('普通话', 'zh-CN'),
      voice('Fred', 'en-US'),
      voice('Ava (Premium)', 'en-US'),
      voice('Google UK English Female', 'en-GB', false),
    ])
    expect(selected?.name).toBe('Ava (Premium)')
    expect(selectBestEnglishVoice([voice('普通话', 'zh-CN')])).toBeUndefined()
  })
})
