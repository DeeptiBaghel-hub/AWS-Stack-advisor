import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { labelForAnswer } from '../utils/answerLabels';
import api from '../api/axios';

const PILLARS = [
  'Operational Excellence',
  'Security',
  'Reliability',
  'Performance Efficiency',
  'Cost Optimization',
  'Sustainability',
];

const QUICK_LINKS = [
  { to: '/quiz', label: 'Take the quiz', tag: 'query' },
  { to: '/services', label: 'Browse the catalog', tag: 'storage' },
  { to: '/compare', label: 'Compare services', tag: 'orchestration' },
  { to: '/cost-estimator', label: 'Estimate cost', tag: 'compute' },
];

// Everything here is computed from the same data the History page already
// fetches — this page adds no new backend endpoint, just a different,
// aggregated view over the same saved recommendations. That keeps the
// stats honest by construction: there's no separate "dashboard summary"
// data path that could drift out of sync with what History actually shows.
function computeStats(items) {
  const withScores = items.filter((i) => i.wellArchitected?.pillars?.length === 6);

  const overallAvg = withScores.length
    ? Math.round((withScores.reduce((sum, i) => sum + i.wellArchitected.overall, 0) / withScores.length) * 10) / 10
    : null;

  const pillarAverages = PILLARS.map((pillar) => {
    const scores = withScores
      .map((i) => i.wellArchitected.pillars.find((p) => p.pillar === pillar)?.score)
      .filter((s) => typeof s === 'number');
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { pillar, avg: Math.round(avg * 10) / 10 };
  });

  const workloadCounts = {};
  items.forEach((i) => {
    const w = i.answers?.workload;
    if (!w) return;
    workloadCounts[w] = (workloadCounts[w] || 0) + 1;
  });
  const workloadBreakdown = Object.entries(workloadCounts)
    .map(([value, count]) => ({ label: labelForAnswer('workload', value), count }))
    .sort((a, b) => b.count - a.count);

  const maxWorkloadCount = workloadBreakdown[0]?.count || 1;

  return { overallAvg, pillarAverages, workloadBreakdown, maxWorkloadCount, scoredCount: withScores.length };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/recommend/history')
      .then((res) => setItems(res.data.recommendations))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your dashboard.'))
      .finally(() => {});
  }, []);

  const stats = useMemo(() => computeStats(items || []), [items]);
  const recent = (items || []).slice(0, 4);

  if (items === null && !error) {
    return (
      <div className="wrap">
        <p className="empty-state">Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="eyebrow">your dashboard</div>
      <h1>Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1>
      <p className="sub">Everything you've explored, in one place.</p>

      {error && <p className="form-error">{error}</p>}

      <div className="dash-stats">
        <div className="dash-stat">
          <span className="dash-stat-value">{items?.length || 0}</span>
          <span className="dash-stat-label">saved stack{items?.length === 1 ? '' : 's'}</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-value">{stats.overallAvg ?? '—'}</span>
          <span className="dash-stat-label">avg. well-architected score</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-value">{stats.workloadBreakdown[0]?.label.split(' ').slice(0, 2).join(' ') || '—'}</span>
          <span className="dash-stat-label">most explored workload</span>
        </div>
      </div>

      <div className="dash-quick-links">
        {QUICK_LINKS.map((q) => (
          <Link to={q.to} key={q.to} className="dash-quick-link">
            {q.label} &rarr;
          </Link>
        ))}
      </div>

      {items && items.length === 0 ? (
        <div className="card" style={{ marginTop: 30 }}>
          <p className="empty-state" style={{ padding: 0 }}>
            You haven't saved a stack yet. <Link to="/quiz">Take the quiz</Link> and save your
            first result to start seeing stats here.
          </p>
        </div>
      ) : (
        <div className="dash-grid">
          <div className="card dash-panel">
            <p className="q-tag" style={{ marginBottom: 16 }}>recent activity</p>
            <div className="dash-recent-list">
              {recent.map((item) => (
                <div className="dash-recent-item" key={item._id}>
                  <div>
                    <p className="dash-recent-title">{item.title}</p>
                    <span className="dash-recent-date">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  {item.wellArchitected && (
                    <span className="dash-recent-score">{item.wellArchitected.overall}/5</span>
                  )}
                </div>
              ))}
            </div>
            <Link to="/history" className="dash-view-all">view all in history &rarr;</Link>
          </div>

          <div className="card dash-panel">
            <p className="q-tag" style={{ marginBottom: 16 }}>workloads you've explored</p>
            {stats.workloadBreakdown.length === 0 ? (
              <p className="empty-state" style={{ padding: 0 }}>No data yet.</p>
            ) : (
              <div className="dash-breakdown">
                {stats.workloadBreakdown.map((w) => (
                  <div className="dash-breakdown-row" key={w.label}>
                    <span className="dash-breakdown-label">{w.label}</span>
                    <div className="dash-breakdown-bar-track">
                      <div
                        className="dash-breakdown-bar-fill"
                        style={{ width: `${(w.count / stats.maxWorkloadCount) * 100}%` }}
                      />
                    </div>
                    <span className="dash-breakdown-count">{w.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {stats.scoredCount > 0 && (
            <div className="card dash-panel dash-panel-wide">
              <p className="q-tag" style={{ marginBottom: 4 }}>
                average well-architected score across {stats.scoredCount} saved stack{stats.scoredCount === 1 ? '' : 's'}
              </p>
              <div className="dash-waf-grid">
                {stats.pillarAverages.map((p) => (
                  <div className="dash-waf-pillar" key={p.pillar}>
                    <div className="waf-pillar-head">
                      <span className="waf-pillar-name">{p.pillar}</span>
                      <span className="waf-pillar-score">{p.avg}/5</span>
                    </div>
                    <div className="waf-bar">
                      <div className="waf-bar-fill" style={{ width: `${(p.avg / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
