import type { SVGProps } from 'react'

export type IconName =
  | 'career'
  | 'player'
  | 'history'
  | 'settings'
  | 'calendar'
  | 'check'
  | 'arrow'
  | 'attack'
  | 'defense'
  | 'physical'
  | 'mental'
  | 'team'
  | 'coach'
  | 'fans'
  | 'save'
  | 'info'
  | 'up'
  | 'down'

const paths: Record<IconName, React.ReactNode> = {
  career: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 7h8M8 12h8M8 17h5" />
    </>
  ),
  player: (
    <>
      <circle cx="12" cy="7" r="3.5" />
      <path d="M5 21c.7-5 3-7.5 7-7.5s6.3 2.5 7 7.5" />
    </>
  ),
  history: (
    <>
      <path d="M4 4h16v17H4zM8 8h8M8 12h8M8 16h5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M7 2v6M17 2v6M3 10h18" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  arrow: <path d="M5 12h14M14 6l6 6-6 6" />,
  attack: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v5M22 12h-5M12 22v-5M2 12h5" />
    </>
  ),
  defense: <path d="M12 2 4 5v6c0 5 3 8.5 8 11 5-2.5 8-6 8-11V5l-8-3Z" />,
  physical: (
    <>
      <path d="M3 9v6M6 7v10M9 10v4M15 10v4M18 7v10M21 9v6M9 12h6" />
    </>
  ),
  mental: (
    <>
      <path d="M8 20v-3.5a7 7 0 1 1 8-1.2V20" />
      <path d="M9 9h6M12 6v6" />
    </>
  ),
  team: (
    <>
      <circle cx="8" cy="9" r="3" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M2 21c.7-4.5 2.7-6.5 6-6.5s5.3 2 6 6.5M14 14c3.8-.2 6.3 2 7 6" />
    </>
  ),
  coach: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c.5-4.5 2.5-6.5 6-6.5s5.5 2 6 6.5M16 7h5M18.5 4.5v5" />
    </>
  ),
  fans: (
    <>
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="8" r="2.5" />
      <path d="M2 20c.5-4 2.5-6 6-6s5.5 2 6 6M11 16c1.2-1.3 2.8-2 5-2 3.5 0 5.5 2 6 6" />
    </>
  ),
  save: (
    <>
      <path d="M4 3h13l3 3v15H4z" />
      <path d="M8 3v6h8V3M8 21v-7h8v7" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  up: <path d="m6 15 6-6 6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
}

export function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
