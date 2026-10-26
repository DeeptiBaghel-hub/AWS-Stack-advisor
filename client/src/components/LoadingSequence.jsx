const DEFAULT_STEPS = [
  'Reading your answers',
  'Matching workload patterns',
  'Weighing operational tradeoffs',
  'Drafting your architecture',
];

export default function LoadingSequence({ stage, steps = DEFAULT_STEPS, heading = 'building your stack' }) {
  return (
    <div className="loading-seq">
      <div className="loading-seq-head">
        <span className="loading-dot" />
        <span>{heading}</span>
      </div>
      <ul className="loading-steps">
        {steps.map((label, i) => {
          const state = i < stage ? 'done' : i === stage ? 'active' : 'pending';
          return (
            <li key={label} className={`loading-step ${state}`}>
              <span className="loading-step-mark">
                {state === 'done' ? (
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : state === 'active' ? (
                  <span className="loading-spinner" />
                ) : (
                  <span className="loading-step-dot" />
                )}
              </span>
              <span className="loading-step-label">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
