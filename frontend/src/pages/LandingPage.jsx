import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Diagram from '../components/Diagram';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const previewData = {
  nodes: [
    { id: 'a', tag: 'entry', name: 'Client', entry: true },
    { id: 'b', tag: 'compute', name: 'AWS Lambda +' },
    { id: 'c', tag: 'database', name: 'Amazon DynamoDB' },
    { id: 'd', tag: 'storage', name: 'Amazon S3', optional: true },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
    { from: 'b', to: 'd', optional: true },
  ],
};

const entryPoints = [
  {
    tag: 'query',
    title: 'Take the quiz',
    text: 'Five questions about what you\'re building, and you get back a suggested stack with reasoning — no account needed.',
    to: '/quiz',
    cta: 'start the assessment',
  },
  {
    tag: 'storage',
    title: 'Browse the catalog',
    text: '25 AWS services with plain-English pricing, scaling behavior, and where each one actually fits.',
    to: '/services',
    cta: 'see all services',
  },
  {
    tag: 'orchestration',
    title: 'Compare head-to-head',
    text: 'Lambda vs EC2, RDS vs Aurora — pick any two services and get a real side-by-side breakdown.',
    to: '/compare',
    cta: 'compare services',
  },
];

const features = [
  {
    tag: 'ml',
    title: 'Ask the assistant',
    text: 'A chat assistant grounded in the same catalog and comparisons the rest of the app shows — ask "why ECS over EKS" and get a real answer.',
  },
  {
    tag: 'compute',
    title: 'See the architecture, not just a list',
    text: 'Every quiz result renders as a small schematic — compute, data, and delivery, connected the way they would be in a real design doc.',
  },
  {
    tag: 'database',
    title: 'Save what you find',
    text: 'Sign in to keep a history of the stacks you\'ve explored, export any of them as a PDF, and come back to compare them later.',
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [savedCount, setSavedCount] = useState(null);

  useEffect(() => {
    if (!user) return;
    // Same protection as ComparePage/SharedResultPage: a rapid
    // login-then-logout (or account switch) could otherwise let a stale
    // response for the previous user set the saved-stack count for
    // whoever's now signed in — or nobody at all.
    let ignore = false;
    api
      .get('/recommend/history')
      .then((res) => {
        if (!ignore) setSavedCount(res.data.recommendations.length);
      })
      .catch(() => {
        if (!ignore) setSavedCount(null);
      });
    return () => {
      ignore = true;
    };
  }, [user]);

  return (
    <div className="wrap">
      {user && (
        <div className="welcome-banner">
          <div>
            <span className="welcome-name">Welcome back, {user.name.split(' ')[0]}.</span>{' '}
            {savedCount === null
              ? 'Loading your saved stacks…'
              : savedCount > 0
                ? `You have ${savedCount} saved stack${savedCount === 1 ? '' : 's'}.`
                : 'You haven\'t saved a stack yet — run the quiz and save your first one.'}
          </div>
          <Link to="/dashboard" className="btn btn-primary">go to dashboard &rarr;</Link>
        </div>
      )}

      <div className="hero">
        <div className="eyebrow">schematic / v1</div>
        <h1>A working toolkit for picking an AWS architecture, not just a quiz</h1>
        <p className="sub">
          Get a guided recommendation, browse 25 services in plain English, compare any two
          head-to-head, or ask an assistant grounded in the same data. Start wherever's useful.
        </p>
      </div>

      <div className="entry-grid">
        {entryPoints.map((e) => (
          <div className="entry-card" key={e.title}>
            <div className="feature-icon">
              <Icon tag={e.tag} size={22} />
            </div>
            <h3>{e.title}</h3>
            <p>{e.text}</p>
            <Link to={e.to} className="btn btn-primary entry-cta">{e.cta} &rarr;</Link>
          </div>
        ))}
      </div>

      <div className="hero-preview card">
        <div className="q-tag">example quiz output — with an optional branch</div>
        <Diagram data={previewData} />
      </div>

      <div className="feature-grid">
        {features.map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon">
              <Icon tag={f.tag} size={22} />
            </div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>

      <div className="footnote" style={{ marginTop: 46 }}>
        <p style={{ margin: 0 }}>
          The recommendation logic is rule-based, running entirely on our own API — it isn't a
          live call to AWS pricing or service availability. Good for a starting point, worth a
          second look before it ships.
        </p>
      </div>

      <p className="landing-how-link">
        <Link to="/how-it-works">Curious how this app itself is built? &rarr;</Link>
      </p>
    </div>
  );
}
