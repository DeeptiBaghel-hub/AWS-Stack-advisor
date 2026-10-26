import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import api from '../api/axios';

const DEFAULT_A = 'aws-lambda';
const DEFAULT_B = 'amazon-ec2';

const ATTRIBUTE_ROWS = [
  { key: 'category', label: 'Category' },
  { key: 'managementLevel', label: 'Management level' },
  { key: 'pricingModel', label: 'Pricing model' },
  { key: 'scaling', label: 'Scaling' },
  { key: 'freeTier', label: 'Free tier' },
];

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const a = searchParams.get('a') || DEFAULT_A;
  const b = searchParams.get('b') || DEFAULT_B;

  const [allServices, setAllServices] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/services'), api.get('/services/compare/featured')])
      .then(([svcRes, featRes]) => {
        setAllServices(svcRes.data.services);
        setFeatured(featRes.data.comparisons);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!a || !b) return;
    // Guards against a real race: clicking through comparison pairs
    // quickly can resolve out of order (a slower first request finishing
    // after a faster second one), which would otherwise silently show the
    // wrong comparison for whatever's currently selected. This flag makes
    // a stale response a no-op instead of an incorrect overwrite.
    let ignore = false;
    setLoading(true);
    setError('');
    api
      .get('/services/compare', { params: { a, b } })
      .then((res) => {
        if (!ignore) setResult(res.data);
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || 'Could not run that comparison.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [a, b]);

  function setPair(slugA, slugB) {
    setSearchParams({ a: slugA, b: slugB });
  }

  function nameFor(slug) {
    return allServices.find((s) => s.slug === slug)?.name || slug;
  }

  return (
    <div className="wrap">
      <div className="eyebrow">head-to-head</div>
      <h1>Compare AWS services</h1>
      <p className="sub">
        Pick any two services from the catalog for a side-by-side breakdown — or jump straight to
        one of the comparisons people ask about most.
      </p>

      {featured.length > 0 && (
        <div className="featured-pairs">
          {featured.map((f) => (
            <button key={`${f.slugA}-${f.slugB}`} className="featured-pill" onClick={() => setPair(f.slugA, f.slugB)}>
              {nameFor(f.slugA)} <span>vs</span> {nameFor(f.slugB)}
            </button>
          ))}
        </div>
      )}

      <div className="compare-pickers">
        <label htmlFor="compare-service-a" className="sr-only">First service to compare</label>
        <select id="compare-service-a" aria-label="First service to compare" value={a} onChange={(e) => setPair(e.target.value, b)}>
          {allServices.map((s) => (
            <option key={s.slug} value={s.slug}>{s.name}</option>
          ))}
        </select>
        <span className="vs-label" aria-hidden="true">vs</span>
        <label htmlFor="compare-service-b" className="sr-only">Second service to compare</label>
        <select id="compare-service-b" aria-label="Second service to compare" value={b} onChange={(e) => setPair(a, e.target.value)}>
          {allServices.map((s) => (
            <option key={s.slug} value={s.slug}>{s.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="empty-state">Comparing…</p>}

      {!loading && result && (
        <>
          {result.curated && (
            <div className="verdict-card">
              <div className="q-tag">verdict</div>
              <p className="verdict-text">{result.curated.verdict}</p>
              <div className="verdict-columns">
                <div>
                  <b>{result.serviceA.name}</b>
                  <p>{result.curated.chooseA}</p>
                </div>
                <div>
                  <b>{result.serviceB.name}</b>
                  <p>{result.curated.chooseB}</p>
                </div>
              </div>
            </div>
          )}

          <div className="compare-table">
            <div className="compare-table-head">
              <div />
              <div className="compare-col-head">
                <Icon tag={result.serviceA.tag} size={22} />
                <span>{result.serviceA.name}</span>
              </div>
              <div className="compare-col-head">
                <Icon tag={result.serviceB.tag} size={22} />
                <span>{result.serviceB.name}</span>
              </div>
            </div>

            {ATTRIBUTE_ROWS.map((row) => (
              <div className="compare-row" key={row.key}>
                <div className="compare-row-label">{row.label}</div>
                <div className="compare-cell">{result.serviceA[row.key]}</div>
                <div className="compare-cell">{result.serviceB[row.key]}</div>
              </div>
            ))}

            <div className="compare-row">
              <div className="compare-row-label">Best for</div>
              <div className="compare-cell">
                <ul>{result.serviceA.bestFor.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
              <div className="compare-cell">
                <ul>{result.serviceB.bestFor.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
            </div>

            <div className="compare-row">
              <div className="compare-row-label">Watch out for</div>
              <div className="compare-cell">
                <ul>{result.serviceA.watchOuts.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
              <div className="compare-cell">
                <ul>{result.serviceB.watchOuts.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
