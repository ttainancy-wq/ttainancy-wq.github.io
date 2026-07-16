import { useEffect } from 'react'
import { speak } from '../lib/speech'

interface RewardOverlayProps {
  title: string
  message: string
  stars: number
  onDone: () => void
}

export function RewardOverlay({ title, message, stars, onDone }: RewardOverlayProps) {
  useEffect(() => {
    speak(`${title}. ${message}`)
    const timer = window.setTimeout(onDone, 3400)
    return () => window.clearTimeout(timer)
  }, [message, onDone, title])

  return (
    <div className="reward-overlay" role="dialog" aria-modal="true" aria-label="完成奖励">
      <div className="confetti">
        {Array.from({ length: 28 }, (_, index) => (
          <i key={index} style={{ '--i': index } as React.CSSProperties} />
        ))}
      </div>
      <span className="reward-mascot">🦊</span>
      <h2>{title}</h2>
      <p>{message}</p>
      <strong>⭐ +{stars}</strong>
      <button type="button" onClick={onDone}>
        返回绘本地图
      </button>
    </div>
  )
}
