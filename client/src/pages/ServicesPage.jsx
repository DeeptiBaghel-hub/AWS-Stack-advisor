import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import api from '../api/axios';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .get('/services')
      .then((res) => setServices(res.data.services))
      .catch((err) => setError(err.response?.data?.message || 'Could not load the service catalog.'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.category));
    return ['all', ...[...set].sort()];
  }, [services]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchesCategory = category === 'all' || s.category === category;
      const matchesQuery =
        !query ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.tagline.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [services, category, query]);

  return (
    <div className="wrap">
      <div className="eyebrow">catalog</div>
      <h1>25 AWS services, plainly explained</h1>
      <p className="sub">
        Pricing model, scaling behavior, and where each one actually fits — browse the catalog or
        jump straight to a head-to-head comparison.
      </p>

      <div className="catalog-controls">
        <input
          className="catalog-search"
          type="text"
          placeholder="Search services…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="category-pills">
          {categories.map((c) => (
            <button
              key={c}
              className={'pill' + (category === c ? ' active' : '')}
              onClick={() => setCategory(c)}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="empty-state">Loading catalog…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <p className="catalog-count">{filtered.length} of {services.length} services</p>
          <div className="service-grid">
            {filtered.map((s) => (
              <div className="service-card" key={s.slug}>
                <div className="service-card-head">
                  <Icon tag={s.tag} size={22} />
                  <span className="service-card-category">{s.category}</span>
                </div>
                <h3>{s.name}</h3>
                <p className="service-card-tagline">{s.tagline}</p>
                <div className="service-card-meta">
                  <span className={`level-badge level-${s.managementLevel}`}>{s.managementLevel}</span>
                </div>
                <Link to={`/compare?a=${s.slug}`} className="service-card-link">
                  compare this &rarr;
                </Link>
              </div>
            ))}
          </div>
          {filtered.length === 0 && <p className="empty-state">No services match that search.</p>}
        </>
      )}
    </div>
  );
}
