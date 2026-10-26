const services = require('../data/serviceCatalog');
const comparisons = require('../data/comparisons');

// Compact, token-efficient summary of the catalog — enough for the model to
// answer accurately and consistently with what the app itself already shows,
// without needing a full RAG pipeline for a catalog this size.
function buildCatalogSummary() {
  return services
    .map(
      (s) =>
        `- ${s.name} (${s.category}, ${s.managementLevel}): ${s.tagline}. Pricing: ${s.pricingModel}. Best for: ${s.bestFor.join('; ')}. Watch out: ${s.watchOuts.join('; ')}.`
    )
    .join('\n');
}

function buildComparisonSummary() {
  return comparisons
    .map((c) => `- ${c.slugA} vs ${c.slugB}: ${c.verdict}`)
    .join('\n');
}

function buildSystemPrompt(recommendationContext) {
  const parts = [
    'You are the AWS architecture assistant embedded in "Stack Advisor," a tool that recommends AWS service stacks from a short quiz and lets people compare services head-to-head.',
    'Answer questions about AWS services, architecture tradeoffs, and rough cost expectations, grounded in the catalog below. Prefer it over general knowledge when they conflict, since it\'s what the rest of this app shows the user.',
    'If asked about cost, give a rough illustrative range and say plainly that it is not live AWS pricing — the app does not integrate a real-time pricing API.',
    'If asked something unrelated to AWS, cloud architecture, or this app, say briefly that it\'s outside what you can help with here.',
    'Keep answers conversational and concise — a few sentences or a short list, not an essay.',
    '',
    'SERVICE CATALOG:',
    buildCatalogSummary(),
    '',
    'CURATED COMPARISONS:',
    buildComparisonSummary(),
  ];

  if (recommendationContext?.title) {
    parts.push(
      '',
      'THE USER\'S CURRENT RECOMMENDATION:',
      `Title: ${recommendationContext.title}`,
      `Services recommended: ${(recommendationContext.why || []).map((w) => w.name).join(', ')}`
    );
  }

  return parts.join('\n');
}

module.exports = { buildSystemPrompt };
