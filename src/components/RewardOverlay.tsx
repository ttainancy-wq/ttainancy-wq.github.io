import { useEffect, useState } from 'react'
import { speak } from '../lib/speech'

interface RewardOverlayProps {
  title: string
  message: string
  stars: number
  buttonLabel?: string
  variant?: 'stage' | 'book'
  onDone: () => void
}

const CELEBRATION_ICONS = ['⭐', '🌟', '✨', '🌼', '🌸', '🌺', '💫']

export function RewardOverlay({
  title,
  message,
  stars,
  buttonLabel = '继续学习 →',
  variant = 'stage',
  onDone,
}: RewardOverlayProps) {
  const [shower, setShower] = useState(0)

  useEffect(() => {
    speak(`Great job! ${title}`, { rate: 0.78, style: 'celebration' })
  }, [title])

  return (
    <div className={`reward-overlay reward-${variant}`} role="dialog" aria-modal="true" aria-label="完成奖励">
      <div className="celebration-field" key={shower} aria-hidden="true">
        {Array.from({ length: 84 }, (_, index) => (
          <i
            key={index}
            style={{
              '--i': index,
              '--x': `${(index * 47) % 101}%`,
              '--delay': `${-((index * 0.073) % 2.8)}s`,
              '--size': `${20 + (index % 5) * 5}px`,
              '--duration': `${2.4 + (index % 7) * 0.12}s`,
              '--drift': `${(index % 7 - 3) * 14}px`,
            } as React.CSSProperties}
          >
            {CELEBRATION_ICONS[index % CELEBRATION_ICONS.length]}
          </i>
        ))}
      </div>
      <section className="reward-card">
        <span className="reward-mascot">{variant === 'book' ? '🏆' : '🦊'}</span>
        <small>{variant === 'book' ? 'BOOK COMPLETE' : 'STAGE COMPLETE'}</small>
        <h2>{title}</h2>
        <p>{message}</p>
        <strong>⭐ +{stars}</strong>
        <div className="reward-actions">
          <button type="button" onClick={() => setShower(shower + 1)}>再来一场星星雨 ✨</button>
          <button className="reward-continue" type="button" onClick={onDone}>{buttonLabel}</button>
        </div>
      </section>
    </div>
  )
}
