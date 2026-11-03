// Quiz Presets & Deep-Linking Engine
// Allows pre-filling quiz answers via named presets (?preset=saas)
// or individual dimensions (?workload=containers&ops=managed&db=relational).
// Supports instant submission via ?auto=true or ?run=true.

import questions from '../questions.js';

export const QUIZ_PRESETS = {
  startup: {
    id: 'startup',
    label: 'Startup MVP',
    desc: 'Low-cost, serverless prototype that scales to zero when idle.',
    answers: {
      workload: 'web-api',
      ops: 'serverless',
      traffic: 'low',
      db: 'nosql',
      scale: 'startup',
    },
  },
  saas: {
    id: 'saas',
    label: 'Spiky B2B SaaS',
    desc: 'High-growth web API with spiky burst traffic and relational data.',
    answers: {
      workload: 'web-api',
      ops: 'serverless',
      traffic: 'spiky',
      db: 'relational',
      scale: 'growing',
    },
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise Containers',
    desc: 'Mission-critical containerized microservices fleet with strict uptime.',
    answers: {
      workload: 'containers',
      ops: 'managed',
      traffic: 'steady',
      db: 'relational',
      scale: 'enterprise',
    },
  },
  analytics: {
    id: 'analytics',
    label: 'Serverless Data Lake',
    desc: 'Ad-hoc SQL query pipeline on S3 without managing database servers.',
    answers: {
      workload: 'analytics',
      ops: 'serverless',
      traffic: 'spiky',
      db: 'none',
      scale: 'growing',
    },
  },
  ml: {
    id: 'ml',
    label: 'Machine Learning Pipeline',
    desc: 'Model training and auto-scaled real-time inference endpoint.',
    answers: {
      workload: 'ml',
      ops: 'managed',
      traffic: 'steady',
      db: 'none',
      scale: 'growing',
    },
  },
  static: {
    id: 'static',
    label: 'Global Static Web',
    desc: 'Global edge-cached Jamstack site on CloudFront and S3.',
    answers: {
      workload: 'static',
      ops: 'serverless',
      traffic: 'steady',
      db: 'none',
      scale: 'startup',
    },
  },
};

// Build set of valid values per question ID for defensive sanitization
const VALID_OPTIONS = {};
questions.forEach((q) => {
  VALID_OPTIONS[q.id] = new Set(q.options.map((opt) => opt.v));
});

export function parseQuizParams(searchParams) {
  if (!searchParams) {
    return { answers: {}, autoSubmit: false, presetKey: null, presetLabel: null };
  }

  const params = typeof searchParams.get === 'function'
    ? searchParams
    : new URLSearchParams(searchParams);

  const presetParam = (params.get('preset') || '').toLowerCase().trim();
  let baseAnswers = {};
  let presetKey = null;
  let presetLabel = null;

  if (presetParam && QUIZ_PRESETS[presetParam]) {
    baseAnswers = { ...QUIZ_PRESETS[presetParam].answers };
    presetKey = presetParam;
    presetLabel = QUIZ_PRESETS[presetParam].label;
  }

  // Override or specify individual question dimensions from query params
  const answers = { ...baseAnswers };
  questions.forEach((q) => {
    const val = (params.get(q.id) || '').toLowerCase().trim();
    if (val && VALID_OPTIONS[q.id]?.has(val)) {
      answers[q.id] = val;
    }
  });

  const autoParam = params.get('auto') || params.get('run') || params.get('execute');
  const isAllAnswered = questions.every((q) => Boolean(answers[q.id]));
  const autoSubmit = Boolean(autoParam === 'true' || autoParam === '1') && isAllAnswered;

  return {
    answers,
    autoSubmit,
    presetKey,
    presetLabel,
    isComplete: isAllAnswered,
  };
}

export function buildQuizShareUrl(answers = {}, autoSubmit = false, baseUrl = '') {
  const params = new URLSearchParams();
  Object.entries(answers).forEach(([key, val]) => {
    if (val && VALID_OPTIONS[key]?.has(val)) {
      params.set(key, val);
    }
  });

  if (autoSubmit) {
    params.set('auto', 'true');
  }

  const query = params.toString();
  return `${baseUrl}/quiz${query ? `?${query}` : ''}`;
}
