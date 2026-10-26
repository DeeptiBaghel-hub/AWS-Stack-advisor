// Scores a recommendation against AWS's real, published Well-Architected
// Framework — six pillars (aws.amazon.com/architecture/well-architected).
// This is deliberately rule-based, like the recommendation engine itself:
// scores and reasoning are derived from the actual quiz answers, not an
// LLM guessing plausibly. That's what makes it defensible rather than
// decorative — the tradeoff is it only reasons about the dimensions this
// app actually asked about, not a full audit.

const PILLARS = [
  'Operational Excellence',
  'Security',
  'Reliability',
  'Performance Efficiency',
  'Cost Optimization',
  'Sustainability',
];

function clamp(n) {
  return Math.max(1, Math.min(5, n));
}

function scoreWellArchitected(answers) {
  const a = answers || {};
  const isServerless = a.ops === 'serverless';
  const isManaged = a.ops === 'managed';
  const isFullControl = a.ops === 'full-control';
  const isEnterprise = a.scale === 'enterprise';
  const isStartup = a.scale === 'startup';
  const isSpiky = a.traffic === 'spiky';
  const isSteady = a.traffic === 'steady';

  const pillars = [];

  // --- Operational Excellence ---
  {
    let score = 3;
    let reasoning;
    if (isServerless) {
      score = 5;
      reasoning = 'Serverless compute means AWS handles patching, capacity, and the underlying host entirely — there\'s close to nothing to operate day-to-day.';
    } else if (isManaged) {
      score = 4;
      reasoning = 'Managed containers remove host-level operations, but you\'re still responsible for image builds, deployments, and service configuration.';
    } else {
      score = 2;
      reasoning = 'Self-managed compute means you own OS patching, instance health, and scaling policy — real ongoing operational work, not a one-time setup cost.';
    }
    pillars.push({ pillar: 'Operational Excellence', score, reasoning });
  }

  // --- Security ---
  {
    let score = 3;
    let reasoning;
    if (isFullControl) {
      score = 2;
      reasoning = 'Full control over instances means you\'re responsible for OS-level patching and hardening — a real, recurring security obligation this stack doesn\'t take off your plate.';
    } else if (isServerless || isManaged) {
      score = 4;
      reasoning = 'AWS patches the underlying runtime and host, narrowing your security surface to application code, IAM policy, and configuration — still your job, just a smaller job.';
    }
    if (isEnterprise) score += 1;
    score = clamp(score);
    if (isEnterprise) {
      reasoning += ' At enterprise scale, this is worth pairing with stricter IAM boundaries and audit logging than a default setup gives you.';
    }
    pillars.push({ pillar: 'Security', score, reasoning });
  }

  // --- Reliability ---
  {
    let score = 3;
    let reasoning;
    if (isEnterprise) {
      score = 4;
      reasoning = 'At enterprise scale the recommended data layer favors multi-AZ replication and fast failover — the stack is built assuming downtime has a real cost.';
    } else if (isStartup) {
      score = 2;
      reasoning = 'This is sized for a startup/prototype — likely single-AZ with no redundancy budget yet. Fine to ship with, worth revisiting before it matters.';
    } else {
      score = 3;
      reasoning = 'A reasonable middle ground — some resilience from managed services, but no explicit multi-region or failover strategy baked in.';
    }
    if (isServerless || isManaged) {
      score += 1;
      reasoning += ' Managed compute also means automatic recovery from individual instance failures, which self-managed hosts don\'t give you for free.';
    }
    score = clamp(score);
    pillars.push({ pillar: 'Reliability', score, reasoning });
  }

  // --- Performance Efficiency ---
  {
    let score = 3;
    let reasoning;
    if (isServerless && isSpiky) {
      score = 5;
      reasoning = 'This is close to the ideal case for serverless — spiky traffic that scales instantly with demand instead of being sized for peak load year-round.';
    } else if (isFullControl && isSpiky) {
      score = 2;
      reasoning = 'Spiky traffic on manually-scaled instances is a rough combination — you\'re either over-provisioned most of the time or scrambling during spikes.';
    } else if (isSteady && isFullControl) {
      score = 4;
      reasoning = 'Steady, predictable traffic is actually the case self-managed instances handle well — you can size once and mostly leave it alone.';
    } else if (isServerless || isManaged) {
      score = 4;
      reasoning = 'Managed compute scales with demand automatically, which covers most traffic shapes reasonably well without manual tuning.';
    } else {
      score = 3;
      reasoning = 'Workable, but scaling behavior depends on configuration this quiz doesn\'t capture — worth load-testing before you trust it under real traffic.';
    }
    pillars.push({ pillar: 'Performance Efficiency', score, reasoning });
  }

  // --- Cost Optimization ---
  {
    let score = 3;
    let reasoning;
    if (isServerless && isSpiky) {
      score = 5;
      reasoning = 'You only pay when something actually runs — for bursty, unpredictable traffic this is usually the cheapest honest option, not just the simplest.';
    } else if (isServerless && isSteady) {
      score = 3;
      reasoning = 'Serverless pricing is great for spiky load, but at high, constant volume a reserved or provisioned option can end up cheaper — worth comparing once traffic is predictable.';
    } else if (isFullControl && isSteady) {
      score = 4;
      reasoning = 'Steady traffic is exactly when reserved or committed-use instance pricing pays off — this is a reasonable cost fit, not just an operational tradeoff.';
    } else if (isFullControl && isSpiky) {
      score = 2;
      reasoning = 'Provisioning fixed instances for spiky load usually means paying for idle capacity most of the time to cover peaks — the traffic shape fights the pricing model here.';
    } else {
      score = 3;
      reasoning = 'No major mismatch between traffic pattern and pricing model, but no clear cost advantage either — revisit once real usage data exists.';
    }
    if (isStartup) {
      reasoning += ' Several of the recommended services also have meaningful always-free tiers at this scale.';
    }
    pillars.push({ pillar: 'Cost Optimization', score, reasoning });
  }

  // --- Sustainability ---
  {
    let score = 3;
    let reasoning;
    if (isServerless) {
      score = 5;
      reasoning = 'Serverless compute runs on AWS\'s shared, highly-utilized infrastructure — no capacity sits idle waiting for your traffic, which is the main lever this pillar cares about.';
    } else if (isManaged) {
      score = 4;
      reasoning = 'Managed containers share underlying capacity more efficiently than dedicated always-on instances, though less so than fully serverless compute.';
    } else {
      score = 2;
      reasoning = 'Fixed, always-on instances risk sitting under-utilized outside peak hours unless actively right-sized — worth revisiting instance sizing periodically.';
    }
    pillars.push({ pillar: 'Sustainability', score, reasoning });
  }

  const overall = Math.round((pillars.reduce((sum, p) => sum + p.score, 0) / pillars.length) * 10) / 10;

  return { pillars, overall };
}

module.exports = { scoreWellArchitected, PILLARS };
