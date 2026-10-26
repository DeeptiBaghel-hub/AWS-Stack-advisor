// Client-side only, same as the PDF export — no backend endpoint, just a
// Blob download. Deliberately strips database-internal fields (_id, user,
// __v) when exporting a saved history item: the point is a clean, portable
// representation of the recommendation itself, not a raw dump of whatever
// happens to be in Mongo. Someone piping this into their own tooling
// shouldn't have to know or care that it came from a MongoDB document.

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export function exportRecommendationJson(recommendation) {
  const clean = {
    title: recommendation.title,
    diagram: recommendation.diagram,
    why: recommendation.why,
    footnotes: recommendation.footnotes,
    wellArchitected: recommendation.wellArchitected || null,
  };

  // createdAt only exists on saved history items, not a fresh in-session
  // result straight off the quiz — include it when it's actually there
  // rather than writing a misleading null.
  if (recommendation.createdAt) {
    clean.createdAt = recommendation.createdAt;
  }

  const json = JSON.stringify(clean, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const filename = slugify(recommendation.title) || 'aws-stack-recommendation';
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
