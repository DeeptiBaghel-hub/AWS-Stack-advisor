import questions from '../questions';

const LOOKUP = Object.fromEntries(
  questions.map((q) => [q.id, Object.fromEntries(q.options.map((o) => [o.v, o.label]))])
);

// Given { workload: 'web-api', ops: 'serverless', ... }, returns the same
// human-readable labels the stepped quiz shows for each choice — used to
// show someone what the AI understood from their free-text description,
// in the same words the quiz itself would have used.
export function labelForAnswer(questionId, value) {
  return LOOKUP[questionId]?.[value] || value;
}

export function describeExtractedAnswers(extracted) {
  if (!extracted) return [];
  return Object.entries(extracted).map(([id, value]) => ({
    id,
    tag: questions.find((q) => q.id === id)?.tag || id,
    label: labelForAnswer(id, value),
  }));
}
