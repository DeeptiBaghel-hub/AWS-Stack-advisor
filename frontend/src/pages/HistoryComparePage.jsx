import { useLocation, Link } from 'react-router-dom';
import { comparePillars, compareServices, buildVerdict } from '../utils/compareHistory';

function WinnerMark({ side, winner }) {
  if (winner === 'tie') return <span className="hcmp-tie">tie</span>;
  if (winner === side) return <span className="hcmp-win">&#9679; wins</span>;
  return null;
}

export default function HistoryComparePage() {
  const location = useLocation();
  const { recA, recB } = location.state || {};

  if (!recA || !recB) {
    return (
      <div className="wrap">
        <p className="empty-state">
          Nothing selected to compare. <Link to="/history">Go back to history</Link>, select two
          saved stacks, and try again.
        </p>
      </div>
    );
  }

  const pillars = comparePillars(recA, recB);
  const services = compareServices(recA, recB);
  const verdict = buildVerdict(recA, recB, pillars);

  return (
    <div className="wrap">
      <div className="eyebrow">comparing two saved stacks</div>
      <h1>{recA.title} vs {recB.title}</h1>
      <p className="sub">{verdict}</p>

      <div className="hcmp-header-grid">
        <div className="hcmp-header-card">
          <span className="hcmp-side-label">stack a</span>
          <p className="hcmp-header-title">{recA.title}</p>
          <span className="hcmp-header-date">saved {new Date(recA.createdAt).toLocaleDateString()}</span>
          {recA.wellArchitected && <span className="hcmp-header-score">{recA.wellArchitected.overall}/5 overall</span>}
        </div>
        <div className="hcmp-header-card">
          <span className="hcmp-side-label">stack b</span>
          <p className="hcmp-header-title">{recB.title}</p>
          <span className="hcmp-header-date">saved {new Date(recB.createdAt).toLocaleDateString()}</span>
          {recB.wellArchitected && <span className="hcmp-header-score">{recB.wellArchitected.overall}/5 overall</span>}
        </div>
      </div>

      <p className="q-tag" style={{ margin: '30px 0 14px' }}>well-architected, pillar by pillar</p>
      <div className="hcmp-pillar-table">
        {pillars.rows.map((row) => (
          <div className="hcmp-pillar-row" key={row.pillar}>
            <span className="hcmp-pillar-name">{row.pillar}</span>
            <span className={'hcmp-pillar-score' + (row.winner === 'a' ? ' hcmp-score-win' : '')}>
              {row.scoreA ?? '—'}
            </span>
            <WinnerMark side="a" winner={row.winner} />
            <span className={'hcmp-pillar-score' + (row.winner === 'b' ? ' hcmp-score-win' : '')}>
              {row.scoreB ?? '—'}
            </span>
            <WinnerMark side="b" winner={row.winner} />
          </div>
        ))}
      </div>

      <p className="q-tag" style={{ margin: '30px 0 14px' }}>services</p>
      <div className="hcmp-services-grid">
        {services.shared.length > 0 && (
          <div className="hcmp-service-col">
            <span className="hcmp-service-col-title">used by both</span>
            {services.shared.map((s) => <span className="hcmp-service-chip shared" key={s}>{s}</span>)}
          </div>
        )}
        <div className="hcmp-service-col">
          <span className="hcmp-service-col-title">only in stack a</span>
          {services.onlyA.length === 0
            ? <span className="hcmp-service-empty">nothing unique</span>
            : services.onlyA.map((s) => <span className="hcmp-service-chip" key={s}>{s}</span>)}
        </div>
        <div className="hcmp-service-col">
          <span className="hcmp-service-col-title">only in stack b</span>
          {services.onlyB.length === 0
            ? <span className="hcmp-service-empty">nothing unique</span>
            : services.onlyB.map((s) => <span className="hcmp-service-chip" key={s}>{s}</span>)}
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: 36 }}>
        <Link to="/history" className="btn">&larr; back to history</Link>
      </div>
    </div>
  );
}
