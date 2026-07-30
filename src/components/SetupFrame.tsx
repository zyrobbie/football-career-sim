import type { ReactNode } from 'react'
import { Brand } from './Brand'

export function SetupFrame({
  step,
  title,
  description,
  children,
}: {
  step: number
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className={`setup-shell setup-shell--step-${step}`}>
      <header className="setup-header">
        <Brand compact />
        <div className="setup-header__pitch" aria-hidden="true" />
        <p>
          建档 <strong>{step}</strong> / 5
        </p>
        <ol className="step-rail" aria-label={`建档进度，第${step}步，共5步`}>
          {[1, 2, 3, 4, 5].map((value) => (
            <li
              key={value}
              className={
                value < step
                  ? 'is-complete'
                  : value === step
                    ? 'is-current'
                    : ''
              }
            >
              <span>{value < step ? '✓' : value}</span>
            </li>
          ))}
        </ol>
      </header>
      <section className="setup-paper">
        <div className="setup-intro">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </section>
    </main>
  )
}
