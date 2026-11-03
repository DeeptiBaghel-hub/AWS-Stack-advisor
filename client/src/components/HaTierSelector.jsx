import { HA_TIERS } from '../utils/haDisasterRecovery';

export default function HaTierSelector({ activeTier, onSelectTier }) {
  const current = HA_TIERS[activeTier] || HA_TIERS['multi-az'];

  return (
    <div className="ha-tier-selector">
      <div className="ha-tier-header">
        <div>
          <div className="q-tag" style={{ marginBottom: 4 }}>high availability &amp; disaster recovery mode</div>
          <span className="ha-tier-title">Architectural Resiliency Tier</span>
        </div>
        <div className="ha-rto-rpo-badges">
          <span className="ha-metric-badge" title="Recovery Time Objective (Downtime before restore)">
            RTO: <strong>{current.rto}</strong>
          </span>
          <span className="ha-metric-badge" title="Recovery Point Objective (Maximum acceptable data loss)">
            RPO: <strong>{current.rpo}</strong>
          </span>
        </div>
      </div>

      <div className="ha-pills-row">
        {Object.values(HA_TIERS).map((t) => {
          const isActive = t.id === activeTier;
          return (
            <button
              key={t.id}
              className={`ha-pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTier(t.id)}
              aria-pressed={isActive}
            >
              <div className="ha-pill-top">
                <span className="ha-pill-label">{t.label}</span>
                <span className={`ha-pill-badge ${t.id}`}>{t.badge}</span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="ha-tier-desc">{current.description}</p>
    </div>
  );
}

