const PILLARS = [
  'Operational Excellence',
  'Security',
  'Reliability',
  'Performance Efficiency',
  'Cost Optimization',
  'Sustainability',
];

// Given two recommendations' Well-Architected scores, returns per-pillar
// winners plus an overall tally — the actual substance of "compare these
// two stacks," not just showing both side by side and letting the person
// eyeball six numbers each.
export function comparePillars(recA, recB) {
  const pillarsA = recA.wellArchitected?.pillars || [];
  const pillarsB = recB.wellArchitected?.pillars || [];

  const rows = PILLARS.map((pillar) => {
    const scoreA = pillarsA.find((p) => p.pillar === pillar)?.score ?? null;
    const scoreB = pillarsB.find((p) => p.pillar === pillar)?.score ?? null;
    let winner = 'tie';
    if (scoreA !== null && scoreB !== null) {
      if (scoreA > scoreB) winner = 'a';
      else if (scoreB > scoreA) winner = 'b';
    }
    return { pillar, scoreA, scoreB, winner };
  });

  const winsA = rows.filter((r) => r.winner === 'a').length;
  const winsB = rows.filter((r) => r.winner === 'b').length;

  return { rows, winsA, winsB };
}

// Which services each stack actually uses, split into what's shared and
// what's unique to each — the concrete, checkable answer to "what's
// actually different about these two architectures," rather than making
// someone read both diagrams and spot the difference themselves.
export function compareServices(recA, recB) {
  const namesA = (recA.why || []).map((w) => w.name);
  const namesB = (recB.why || []).map((w) => w.name);
  const setA = new Set(namesA);
  const setB = new Set(namesB);

  return {
    shared: namesA.filter((n) => setB.has(n)),
    onlyA: namesA.filter((n) => !setB.has(n)),
    onlyB: namesB.filter((n) => !setA.has(n)),
  };
}

// A one-line, plain-language summary of the pillar comparison — the thing
// someone actually reads first, before the six-row breakdown.
export function buildVerdict(recA, recB, pillarComparison) {
  const { winsA, winsB } = pillarComparison;
  if (winsA === winsB) {
    return 'These two stacks score evenly overall — the right pick depends on which specific pillar matters most for your situation.';
  }
  const winnerTitle = winsA > winsB ? recA.title : recB.title;
  const winnerLabel = winsA > winsB ? 'A' : 'B';
  const winCount = Math.max(winsA, winsB);
  return `Stack ${winnerLabel} ("${winnerTitle}") scores higher on ${winCount} of 6 pillars overall.`;
}

export { PILLARS };
