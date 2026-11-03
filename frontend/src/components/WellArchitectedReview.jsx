export default function WellArchitectedReview({ data }) {
  if (!data?.pillars) return null;

  return (
    <div className="waf-review">
      <div className="waf-head">
        <div>
          <p className="q-tag" style={{ marginBottom: 4 }}>well-architected review</p>
          <p className="waf-subtitle">Scored against AWS's own 6-pillar framework, based on your answers.</p>
        </div>
        <div className="waf-overall">
          <span className="waf-overall-value">{data.overall}</span>
          <span className="waf-overall-max">/5</span>
        </div>
      </div>

      <div className="waf-grid">
        {data.pillars.map((p) => (
          <div className="waf-pillar" key={p.pillar}>
            <div className="waf-pillar-head">
              <span className="waf-pillar-name">{p.pillar}</span>
              <span className="waf-pillar-score">{p.score}/5</span>
            </div>
            <div className="waf-bar">
              <div className="waf-bar-fill" style={{ width: `${(p.score / 5) * 100}%` }} />
            </div>
            <p className="waf-pillar-text">{p.reasoning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
