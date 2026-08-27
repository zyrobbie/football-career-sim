export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand${compact ? ' brand--compact' : ''}`}>
      <span className="brand__name">上场</span>
      {!compact ? (
        <span className="brand__english">TAKE THE FIELD</span>
      ) : null}
    </div>
  )
}
