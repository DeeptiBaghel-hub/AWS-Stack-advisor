import Diagram from '../components/Diagram';
import WhyCard from '../components/WhyCard';

// The app's own architecture, rendered with the exact same diagram engine
// built for AWS recommendations — same node/edge shape, same branching and
// optional-path logic. Nothing special-cased for this page; if the engine
// can lay out a real graph, it can lay out this one too.
const SELF_DIAGRAM = {
  nodes: [
    { id: 'client', tag: 'entry', name: 'Browser (React + Vite)', entry: true },
    { id: 'api', tag: 'compute', name: 'Express API (Node.js)' },
    { id: 'db', tag: 'database', name: 'MongoDB' },
    { id: 'gemini', tag: 'ml', name: 'Google Gemini', optional: true },
    { id: 'sentry', tag: 'monitor', name: 'Sentry', optional: true },
  ],
  edges: [
    { from: 'client', to: 'api' },
    { from: 'api', to: 'db' },
    { from: 'api', to: 'gemini', optional: true },
    { from: 'api', to: 'sentry', optional: true },
  ],
};

const DECISIONS = [
  {
    mark: 'ml',
    name: 'The AI extracts, it never invents',
    text: 'Both the chat assistant and the free-text project intake are grounded — the assistant answers only from this app\'s own service catalog and comparisons, and the intake feature only ever extracts the same five structured parameters the quiz collects. Neither one lets an LLM freely choose AWS services or draw a diagram itself, which is what keeps every recommendation testable and consistent regardless of which entry point produced it.',
  },
  {
    mark: 'query',
    name: 'One recommendation engine, two entry points',
    text: 'The stepped quiz and the free-text description both funnel into the same computeRecommendation() function. There\'s no separate code path that could quietly drift out of sync — if the engine is correct, both entry points are correct, and every downstream feature (the diagram, the Well-Architected score, the PDF export) works identically regardless of which one produced the answers.',
  },
  {
    mark: 'security',
    name: 'Well-Architected scoring against a real framework',
    text: 'Every recommendation is scored against AWS\'s actual, published 6-pillar Well-Architected Framework, with reasoning tied to the specific quiz answers — not an invented "readiness score." Spiky traffic on serverless compute scores differently than the same traffic on manually-scaled EC2, because the framework genuinely treats those cases differently.',
  },
  {
    mark: 'compute',
    name: 'Three independent test layers',
    text: 'Unit tests for pure logic, integration tests hitting the real Express app with an in-memory MongoDB, and Playwright E2E tests driving a real browser against the real client and API. Each layer catches a different class of bug — the E2E suite specifically caught a rate-limiter regression the other two layers structurally couldn\'t see.',
  },
  {
    mark: 'database',
    name: 'Privacy-conscious sharing',
    text: 'Shareable links use a dedicated random shareId, not Mongo\'s own _id — an ObjectId\'s structure can leak roughly when a document was created and how many exist. The public endpoint behind a share link returns only the recommendation itself, never the owning user\'s identity or their raw quiz answers.',
  },
  {
    mark: 'monitor',
    name: 'Observability that\'s genuinely optional',
    text: 'Structured logging and Sentry error tracking are both real, working features — and both are a complete no-op with nothing configured, not a degraded mode. Every request also gets a correlation id, included in the response header and any error body, so a user-reported bug can be traced to one exact log line instead of guessed at.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="wrap">
      <div className="eyebrow">architecture</div>
      <h1>How Stack Advisor actually works</h1>
      <p className="sub">
        The same diagram engine built for recommending AWS architectures, pointed at this app's
        own — plus the real decisions behind it, not just a feature list.
      </p>

      <div className="card" style={{ marginTop: 26 }}>
        <p className="q-tag" style={{ marginBottom: 4 }}>this app's own architecture</p>
        <Diagram data={SELF_DIAGRAM} />
      </div>

      <p className="q-tag" style={{ margin: '34px 0 16px' }}>design decisions worth knowing about</p>
      <div className="why-grid">
        {DECISIONS.map((d) => (
          <WhyCard key={d.name} mark={d.mark} name={d.name} text={d.text} />
        ))}
      </div>

      <div className="footnote" style={{ marginTop: 34 }}>
        <p style={{ margin: 0 }}>
          This page is deliberately built with the same components as the rest of the app — the
          diagram, the reasoning cards — rather than a separate one-off "about" layout. If
          something here looks inconsistent with the rest of the site, that's a real bug, not a
          style choice.
        </p>
      </div>
    </div>
  );
}
