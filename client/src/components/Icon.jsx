// Small monoline icons matching the blueprint/schematic theme.
// Deliberately original shapes (chip, cylinder, crate, etc.) rather than
// reproductions of AWS's own icon set, which is trademarked.

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const icons = {
  entry: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c1-3.4 3.6-5.2 6.5-5.2s5.5 1.8 6.5 5.2" />
    </svg>
  ),
  compute: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <ellipse cx="12" cy="6.5" rx="6.5" ry="2.7" />
      <path d="M5.5 6.5v11c0 1.5 2.9 2.7 6.5 2.7s6.5-1.2 6.5-2.7v-11" />
      <path d="M5.5 12c0 1.5 2.9 2.7 6.5 2.7s6.5-1.2 6.5-2.7" />
    </svg>
  ),
  storage: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <path d="M5 8l1.4-3.4A1 1 0 0 1 7.3 4h9.4a1 1 0 0 1 .9.6L19 8" />
      <rect x="4.5" y="8" width="15" height="11.5" rx="1.2" />
      <path d="M9 12h6" />
    </svg>
  ),
  delivery: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <circle cx="12" cy="12" r="7.2" />
      <path d="M4.8 12h14.4M12 4.8c2.2 2 3.4 4.6 3.4 7.2s-1.2 5.2-3.4 7.2c-2.2-2-3.4-4.6-3.4-7.2S9.8 6.8 12 4.8z" />
    </svg>
  ),
  hosting: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <rect x="4" y="5" width="16" height="14" rx="1.3" />
      <path d="M4 9.5h16" />
      <circle cx="7" cy="7.2" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  ml: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <circle cx="6" cy="7" r="1.6" />
      <circle cx="6" cy="17" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
      <path d="M7.4 7.9L16.6 11.4M7.4 16.1L16.6 12.6M7.3 7.6L11 5.6M7.3 16.4L11 18.4" />
    </svg>
  ),
  serving: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M9 9l4 3-4 3z" fill="currentColor" stroke="none" />
    </svg>
  ),
  ingest: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <path d="M12 3v11" />
      <path d="M7.5 10.5L12 15l4.5-4.5" />
      <path d="M5 18.5c0-1.5 3-2.5 7-2.5s7 1 7 2.5" />
    </svg>
  ),
  etl: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <path d="M4.5 5h15l-5.5 7v6l-4 1.5v-7.5z" />
    </svg>
  ),
  query: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="M18.5 18.5L15 15" />
    </svg>
  ),
  orchestration: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M8 6h4a4 4 0 0 1 4 4v0M8 18h4a4 4 0 0 0 4-4v0" />
    </svg>
  ),
  note: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <path d="M12 2.5l8.5 4.9v9.2L12 21.5l-8.5-4.9V7.4z" />
      <path d="M12 8v5M12 15.5v.1" />
    </svg>
  ),
  cache: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <rect x="4.5" y="4.5" width="11" height="11" rx="1.3" />
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.3" />
    </svg>
  ),
  containers: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <rect x="3.5" y="9" width="7" height="7" rx="1" />
      <rect x="13.5" y="9" width="7" height="7" rx="1" />
      <rect x="8.5" y="3" width="7" height="7" rx="1" />
    </svg>
  ),
  network: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <circle cx="5" cy="6" r="1.8" />
      <circle cx="19" cy="6" r="1.8" />
      <circle cx="12" cy="18" r="1.8" />
      <path d="M6.5 7.3L11 16.5M17.5 7.3L13 16.5M6.8 6h10.4" />
    </svg>
  ),
  messaging: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  ),
  security: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <path d="M12 3l7 3v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  monitor: (
    <svg viewBox="0 0 24 24" {...strokeProps}>
      <path d="M3.5 13a8.5 8.5 0 0 1 17 0" />
      <path d="M12 13l3.5-4.5" />
      <path d="M3.5 13h2M18.5 13h2M12 13v2" />
    </svg>
  ),
};

export default function Icon({ tag, size = 20, className = '' }) {
  const svg = icons[tag] || icons.note;
  return (
    <span
      className={`svc-icon ${className}`}
      style={{ width: size, height: size, display: 'inline-flex' }}
    >
      {svg}
    </span>
  );
}
