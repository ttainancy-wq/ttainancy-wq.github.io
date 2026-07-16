interface SceneArtProps {
  scene: string
  label?: string
  compact?: boolean
}

export function SceneArt({ scene, label, compact = false }: SceneArtProps) {
  const parts = scene.split('|').filter(Boolean)
  return (
    <div className={`scene-art ${compact ? 'compact' : ''}`} role="img" aria-label={label ?? scene}>
      <span className="scene-sun">☀️</span>
      <span className="scene-cloud">☁️</span>
      <div className="scene-ground" />
      {parts.map((part, index) => (
        <span
          className={`scene-item scene-item-${index % 5}`}
          key={`${part}-${index}`}
          style={{ '--scene-index': index } as React.CSSProperties}
        >
          {part}
        </span>
      ))}
    </div>
  )
}
