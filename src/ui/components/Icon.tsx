// Свои линейные иконки вместо эмодзи (iOS подменяет эмодзи системными).
import type { ReactNode, SVGProps } from 'react'

export type IconName = 'tasks' | 'dungeon' | 'hero' | 'casino' | 'gold' | 'torch' | 'shard'

const paths: Record<IconName, ReactNode> = {
  tasks: (
    <>
      <circle cx="6" cy="7" r="2.2" />
      <path d="M5 7l.8.8L7.3 6.2" />
      <path d="M11 7h9M11 12h9M11 17h6" />
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="6" cy="17" r="2.2" />
    </>
  ),
  dungeon: (
    <>
      <path d="M4 21V10a8 8 0 0 1 16 0v11" />
      <path d="M8 21v-8a4 4 0 0 1 8 0v8" />
      <path d="M2.5 21h19" />
    </>
  ),
  hero: (
    <>
      <path d="M12 3l1.6 2.6L16.5 4l-.6 3.4" />
      <path d="M12 3l-1.6 2.6L7.5 4l.6 3.4" />
      <circle cx="12" cy="10.5" r="3.2" />
      <path d="M5.5 21c.6-4 3.2-6.2 6.5-6.2s5.9 2.2 6.5 6.2" />
    </>
  ),
  casino: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <circle cx="8.5" cy="8.5" r="1" />
      <circle cx="15.5" cy="15.5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="15.5" cy="8.5" r="1" />
      <circle cx="8.5" cy="15.5" r="1" />
    </>
  ),
  gold: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 9.5v5" />
    </>
  ),
  torch: (
    <>
      <path d="M12 3c2.8 2.6 4 4.6 4 6.7A4 4 0 0 1 12 14a4 4 0 0 1-4-4.3c0-1.5.8-2.8 2-3.9.2 1.4.9 2.2 1.7 2.6C11.4 6.6 11.4 4.9 12 3z" />
      <path d="M10 14l.8 7h2.4l.8-7" />
    </>
  ),
  shard: (
    <>
      <path d="M12 2.8l5.5 7.4L12 21.2 6.5 10.2z" />
      <path d="M6.5 10.2h11M12 2.8v18.4" />
    </>
  ),
}

export function Icon({
  name,
  size = 22,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}
