export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand${compact ? ' brand--compact' : ''}`}>
      <span className="brand__name">绿茵生涯</span>
      {!compact ? (
        <span className="brand__english">FOOTBALL CAREER</span>
      ) : null}
    </div>
  )
}
