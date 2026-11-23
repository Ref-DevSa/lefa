const iconProps = { viewBox: '0 0 64 64', className: 'size-16', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5 }

export const lockIcon = (
  <svg {...iconProps}>
    <rect x="14" y="28" width="36" height="26" rx="5" />
    <path d="M22 28v-7a10 10 0 0 1 20 0v7" />
    <circle cx="32" cy="41" r="3" />
  </svg>
)

export const searchIcon = (
  <svg {...iconProps}>
    <circle cx="28" cy="28" r="14" />
    <path d="m38 38 12 12" />
  </svg>
)

export const alertIcon = (
  <svg {...iconProps}>
    <path d="M32 10 6 54h52L32 10Z" />
    <path d="M32 26v12M32 45v1" />
  </svg>
)
