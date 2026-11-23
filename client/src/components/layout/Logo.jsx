import { Link } from 'react-router'

/** @param {{ to?: string }} props */
export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 text-xl font-bold text-primary">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <path d="M11 8v16h11" fill="none" stroke="#FAF7F2" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="22" cy="10" r="2.5" fill="#C8902E" />
      </svg>
      Lefa
    </Link>
  )
}
