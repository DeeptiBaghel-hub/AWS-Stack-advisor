// Pure vector SVG generator for AWS Stack Advisor architecture diagrams.
// Generates a 100% standalone SVG (no external font or HTML dependencies)
// that renders perfectly in browsers, Figma, Draw.io, Illustrator, and GitHub.

function slugify(title) {
  return (title || 'aws-architecture')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function layerize(nodes, edges) {
  const ids = nodes.map((n) => n.id);
  const indegree = new Map(ids.map((id) => [id, 0]));
  const children = new Map(ids.map((id) => [id, []]));

  edges.forEach((e) => {
    if (children.has(e.from) && indegree.has(e.to)) {
      children.get(e.from).push(e.to);
      indegree.set(e.to, indegree.get(e.to) + 1);
    }
  });

  const layer = new Map();
  const queue = ids.filter((id) => indegree.get(id) === 0);
  queue.forEach((id) => layer.set(id, 0));
  const indegreeLeft = new Map(indegree);
  const q = [...queue];

  while (q.length) {
    const id = q.shift();
    children.get(id).forEach((childId) => {
      layer.set(childId, Math.max(layer.get(childId) ?? 0, (layer.get(id) ?? 0) + 1));
      indegreeLeft.set(childId, indegreeLeft.get(childId) - 1);
      if (indegreeLeft.get(childId) === 0) q.push(childId);
    });
  }

  let maxLayer = 0;
  layer.forEach((v) => { if (v > maxLayer) maxLayer = v; });
  ids.forEach((id) => { if (!layer.has(id)) layer.set(id, ++maxLayer); });

  const columns = [];
  ids.forEach((id) => {
    const l = layer.get(id);
    if (!columns[l]) columns[l] = [];
    columns[l].push(id);
  });
  return columns.filter(Boolean);
}

function escapeXml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSvg(diagram, title = 'AWS Architecture') {
  const nodes = diagram?.nodes || [];
  const edges = diagram?.edges || [];

  if (nodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100">
      <rect width="100%" height="100%" fill="#0a1622"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8fa7be" font-family="sans-serif" font-size="14">No diagram data available</text>
    </svg>`;
  }

  const columns = layerize(nodes, edges);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const nodeWidth = 180;
  const nodeHeight = 60;
  const colGap = 80;
  const rowGap = 26;
  const padX = 40;
  const padTop = 60;
  const padBottom = 40;

  let maxRows = 1;
  columns.forEach((col) => {
    if (col.length > maxRows) maxRows = col.length;
  });

  const totalWidth = padX * 2 + columns.length * nodeWidth + (columns.length - 1) * colGap;
  const totalHeight = padTop + padBottom + maxRows * nodeHeight + (maxRows - 1) * rowGap;

  // Calculate coordinates for each node
  const coords = new Map();
  columns.forEach((col, cIdx) => {
    const x = padX + cIdx * (nodeWidth + colGap);
    const colHeight = col.length * nodeHeight + (col.length - 1) * rowGap;
    const startY = padTop + (totalHeight - padTop - padBottom - colHeight) / 2;

    col.forEach((nodeId, rIdx) => {
      const y = startY + rIdx * (nodeHeight + rowGap);
      coords.set(nodeId, { x, y });
    });
  });

  const parts = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`);
  parts.push(`  <defs>
    <style>
      .bg { fill: #0a1622; }
      .header-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; font-weight: 600; fill: #e8eff5; }
      .header-sub { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; fill: #8fa7be; font-family: monospace; }
      .node-bg { fill: #0f2237; stroke: rgba(140, 180, 214, 0.28); stroke-width: 1px; rx: 8px; }
      .node-entry { stroke: #57d9c6; stroke-width: 1.5px; }
      .node-optional { stroke: #8fa7be; stroke-dasharray: 4, 4; }
      .tag-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; font-size: 10px; font-weight: 600; fill: #57d9c6; text-transform: uppercase; letter-spacing: 0.05em; }
      .tag-text.optional { fill: #8fa7be; }
      .name-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13.5px; font-weight: 600; fill: #e8eff5; }
      .edge-req { fill: none; stroke: #57d9c6; stroke-width: 2px; }
      .edge-opt { fill: none; stroke: #8fa7be; stroke-width: 1.5px; stroke-dasharray: 5, 5; }
      .badge-opt { fill: rgba(143, 167, 190, 0.15); stroke: rgba(143, 167, 190, 0.3); rx: 3px; }
      .badge-opt-text { font-family: -apple-system, BlinkMacSystemFont, monospace; font-size: 9px; fill: #8fa7be; }
    </style>
  </defs>`);

  // Background
  parts.push(`  <rect width="100%" height="100%" class="bg" />`);

  // Title
  parts.push(`  <text x="${padX}" y="32" class="header-sub">AWS STACK ADVISOR / ARCHITECTURE SCHEMATIC</text>`);
  parts.push(`  <text x="${padX}" y="48" class="header-title">${escapeXml(title)}</text>`);

  // Connectors (Edges)
  edges.forEach((e) => {
    const from = coords.get(e.from);
    const to = coords.get(e.to);
    if (!from || !to) return;

    const x1 = from.x + nodeWidth;
    const y1 = from.y + nodeHeight / 2;
    const x2 = to.x;
    const y2 = to.y + nodeHeight / 2;
    const dx = Math.max(28, (x2 - x1) / 2);
    const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
    const cls = e.optional ? 'edge-opt' : 'edge-req';
    parts.push(`  <path d="${d}" class="${cls}" />`);
  });

  // Nodes
  nodes.forEach((n) => {
    const pos = coords.get(n.id);
    if (!pos) return;

    const { x, y } = pos;
    let nodeClass = 'node-bg';
    if (n.entry) nodeClass += ' node-entry';
    if (n.optional) nodeClass += ' node-optional';

    parts.push(`  <g transform="translate(${x}, ${y})">`);
    parts.push(`    <rect width="${nodeWidth}" height="${nodeHeight}" class="${nodeClass}" />`);

    const tagClass = n.optional ? 'tag-text optional' : 'tag-text';
    parts.push(`    <text x="14" y="24" class="${tagClass}">${escapeXml(n.tag || 'service')}</text>`);
    parts.push(`    <text x="14" y="44" class="name-text">${escapeXml(n.name)}</text>`);

    if (n.optional) {
      parts.push(`    <rect x="${nodeWidth - 56}" y="12" width="46" height="16" class="badge-opt" />`);
      parts.push(`    <text x="${nodeWidth - 33}" y="24" text-anchor="middle" class="badge-opt-text">optional</text>`);
    }

    parts.push(`  </g>`);
  });

  parts.push(`</svg>`);
  return parts.join('\n');
}

export function exportDiagramSvg(diagram, title = 'AWS Architecture') {
  const svgContent = generateSvg(diagram, title);
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const filename = `${slugify(title) || 'architecture'}-diagram.svg`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

