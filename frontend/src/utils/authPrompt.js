const ACCESS_PROMPTS = {
  '/services': {
    eyebrow: 'service catalog',
    title: 'Sign in to explore AWS services',
    description: 'Browse clear explanations, pricing guidance, and use cases for 25 AWS services.',
  },
  '/compare': {
    eyebrow: 'service comparison',
    title: 'Sign in to compare AWS services',
    description: 'See capabilities, trade-offs, and best-fit workloads side by side.',
  },
};

export function getAuthPrompt(from) {
  return ACCESS_PROMPTS[from?.pathname] || null;
}
