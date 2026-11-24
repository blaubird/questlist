// Свои линейные иконки вместо эмодзи (iOS подменяет эмодзи системными).
import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'tasks'
  | 'dungeon'
  | 'hero'
  | 'casino'
  | 'gold'
  | 'torch'
  | 'shard'
  | 'check'
  | 'close'
  | 'plus'
  | 'heart'
  | 'sword'
  | 'shield'
  | 'star'
  | 'potion'
  | 'scroll'
  | 'whirl'
  | 'lock'
  | 'download'
  | 'upload'
  | 'luck'
  | 'soul'
  | 'repeat'
  | 'chest'
  | 'flame'
  | 'chevron'
  | 'dot'
  | 'cloud'

const paths: Record<IconName, ReactNode> = {
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  chevron: <path d="M6 15l6-6 6 6" />,
  dot: <circle cx="12" cy="12" r="2.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  sword: (
    <>
      <path d="M14.5 4H20v5.5L10 19.5 4.5 14z" />
      <path d="M7 12l5 5M4 20l2.5-2.5" />
    </>
  ),
  shield: <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />,
  potion: (
    <>
      <path d="M9.5 3h5M10 3v5.2L5.6 16a3.4 3.4 0 0 0 3 5h6.8a3.4 3.4 0 0 0 3-5L14 8.2V3" />
      <path d="M7.4 14h9.2" />
    </>
  ),
  scroll: (
    <>
      <path d="M7 4h11a2 2 0 0 1 2 2v1h-4" />
      <path d="M16 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10" />
      <path d="M7 4a2 2 0 0 0-2 2v11M9 9h4M9 13h4" />
    </>
  ),
  whirl: (
    <>
      <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <path d="M12 3a9 9 0 0 1 9 9M21 12a9 9 0 0 1-9 9M12 21a9 9 0 0 1-9-9M3 12a9 9 0 0 1 9-9" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  download: <path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14" />,
  upload: <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 20h14" />,
  cloud: <path d="M7 18.5h10.5a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.6 9.1 4.7 4.7 0 0 0 7 18.5z" />,
  luck: <path d="M12 2.5l2 7.5 7.5 2-7.5 2-2 7.5-2-7.5-7.5-2 7.5-2z" />,
  soul: (
    <>
      <path d="M12 21c-3.6 0-6-2.6-6-6 0-4.2 3.4-6 4.2-11 1.8 2 1.4 4.4 1.2 5.6 1.6-.8 2.4-2.4 2.6-3.6C16.4 8.4 18 11 18 15c0 3.4-2.4 6-6 6z" />
      <circle cx="10.4" cy="15.2" r=".8" />
      <circle cx="13.6" cy="15.2" r=".8" />
    </>
  ),
  repeat: <path d="M4 12a7 7 0 0 1 12-4.9L18 9M18 4v5h-5M20 12a7 7 0 0 1-12 4.9L6 15M6 20v-5h5" />,
  chest: (
    <>
      <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v9H4z" />
      <path d="M4 12h16M10.5 12v3h3v-3" />
    </>
  ),
  flame: (
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.5 2.6-5.3 3.4-9 1.7 1.5 2.4 3.3 2.4 5 .9-.6 1.5-1.8 1.6-3 2.5 2 3.6 4.4 3.6 7 0 3.4-2.6 6-4.5 6z" />
  ),
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
