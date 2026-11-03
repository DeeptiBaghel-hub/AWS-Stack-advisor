import { useMemo, useState } from 'react';
import { analyzeFailureModes } from '../utils/failureModes';

export default function FailureModesReview({ recommendation }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'high'
  const [expandedId, setExpandedId] = useState(null);

  const failureModes = useMemo(() => analyzeFailureModes(recommendation), [recommendation]);

  if (!failureModes || failureModes.length === 0) return null;

  const highCount = failureModes.filter((m) => m.severity === 'High').length;
  const filtered = filter === 'high' ? failureModes.filter((m) => m.severity === 'High') : failureModes;

  function toggleExpand(id) {
    setExpandedId((curr) => (curr === id ? null : id));
  }

  return (
    <div className="failure-modes-review card" style={{ marginTop: 28 }}>
      <div className="failure-modes-head">
        <div>
          <div className="q-tag" style={{ marginBottom: 4 }}>architectural pre-mortem</div>
          <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontFamily: 'var(--font-display)' }}>
            Production Failure Modes &amp; Hardening
          </h3>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-dim)' }}>
            How this stack can fail under real-world production load, and how senior engineers harden it before shipping.
          </p>
        </div>
        <div className="failure-modes-summary">
          <span className="badge badge-total">{failureModes.length} failure modes</span>
          {highCount > 0 && (
            <span className="badge badge-high">{highCount} high risk</span>
          )}
        </div>
      </div>

      <div className="failure-modes-filters">
        <button
          className={'pill' + (filter === 'all' ? ' active' : '')}
          onClick={() => setFilter('all')}
        >
          All ({failureModes.length})
        </button>
        {highCount > 0 && (
          <button
            className={'pill' + (filter === 'high' ? ' active' : '')}
            onClick={() => setFilter('high')}
          >
            High Risk Only ({highCount})
          </button>
        )}
      </div>

      <div className="failure-modes-list">
        {filtered.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className={`failure-mode-card ${isExpanded ? 'expanded' : ''}`}
            >
              <div
                className="failure-mode-header"
                onClick={() => toggleExpand(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(item.id);
                  }
                }}
                aria-expanded={isExpanded}
              >
                <div className="failure-mode-title-col">
                  <span className="failure-mode-service">{item.service}</span>
                  <span className="failure-mode-name">{item.title}</span>
                </div>
                <div className="failure-mode-meta">
                  <span className={`severity-tag ${item.severity.toLowerCase()}`}>
                    {item.severity}
                  </span>
                  <span className="expand-indicator">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="failure-mode-body">
                  <div className="failure-detail-row">
                    <span className="failure-label">⚡ Failure Trigger:</span>
                    <span className="failure-val">{item.trigger}</span>
                  </div>
                  <div className="failure-detail-row">
                    <span className="failure-label">💥 Production Impact:</span>
                    <span className="failure-val">{item.impact}</span>
                  </div>
                  <div className="failure-detail-row mitigation-row">
                    <span className="failure-label">🛡️ Hardened Mitigation:</span>
                    <span className="failure-val mitigation-text">{item.mitigation}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

