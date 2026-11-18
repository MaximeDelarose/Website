import type { ReactNode } from "react";

const PATHS = {
  sound: <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5-1.5a6 6 0 0 1 0 9M18.8 5a9.5 9.5 0 0 1 0 14" />,
  mute: <path d="M4 9v6h4l5 4V5L8 9H4Zm12 0 5 6m0-6-5 6" />,
  hint: <path d="M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.200v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.500L19 7.5" />,
  lock: <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6Z" />,
  unlock: <path d="M7 11V8a5 5 0 0 1 9.6-2M6 11h12v9H6Z" />,
  note: <path d="M6 3h9l4 4v14H6ZM9 10h7M9 14h7M9 18h4" />,
  list: <path d="M4 6h2m3 0h11M4 12h2m3 0h11M4 18h2m3 0h11" />,
  grid: <path d="M4 4h7v7H4Zm9 0h7v7h-7ZM4 13h7v7H4Zm9 0h7v7h-7Z" />,
  plane: <path d="M3 13.5 21 5l-4.5 15-4-6.500Zm9.5 0L21 5" />,
  wheel: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5.500a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM12 3v5.500M12 15.500V21M3 12h5.500M15.5 12H21" />,
  back: <path d="M20 6H9l-6 6 6 6h11ZM12 9.500l5 5m0-5-5 5" />,
  replay: <path d="M4 12a8 8 0 1 0 2.6-5.900M4 4v5h5" />,
  share: <path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  eye: <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />,
  left: <path d="M15 5 8 12l7 7" />,
  right: <path d="m9 5 7 7-7 7" />,
  users: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6.5 9a6.5 6.5 0 0 1 13 0M16 4.300a3.5 3.5 0 0 1 0 6.500M18 14.200a6.5 6.5 0 0 1 3.5 5.8" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
