import { useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';

// Lays nodes out in columns by topological depth (so branches and merges
// render as real 2D structure), then measures the actual DOM positions to
// draw SVG connectors between them — rather than assuming a straight chain.
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

  // Any node the pass above never reached (shouldn't happen in a DAG, but
  // guards against a stray/cyclic edge) just goes in its own column.
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

// Screen readers get almost nothing useful from an SVG of curved paths and
// absolutely-positioned boxes — rather than trying to make the visual
// layout itself navigable, this generates an equivalent plain-language
// description and marks the visual diagram as decorative, so a screen
// reader user gets the same information via a normal sentence instead.
function describeDiagramForScreenReader(nodes, edges) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const sentences = edges.map((e) => {
    const from = byId[e.from];
    const to = byId[e.to];
    if (!from || !to) return null;
    const verb = e.optional ? 'optionally connects to' : 'connects to';
    return `${from.name} ${verb} ${to.name}.`;
  }).filter(Boolean);
  return sentences.length ? `Architecture diagram: ${sentences.join(' ')}` : 'Architecture diagram: no connections to show yet.';
}

export default function Diagram({ data }) {
  const nodes = data?.nodes || [];
  const edges = data?.edges || [];
  const containerRef = useRef(null);
  const nodeRefs = useRef({});
  const [paths, setPaths] = useState([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  const columns = layerize(nodes, edges);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  useLayoutEffect(() => {
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const next = edges
        .map((e) => {
          const fromEl = nodeRefs.current[e.from];
          const toEl = nodeRefs.current[e.to];
          if (!fromEl || !toEl) return null;
          const fRect = fromEl.getBoundingClientRect();
          const tRect = toEl.getBoundingClientRect();
          const x1 = fRect.right - cRect.left;
          const y1 = fRect.top - cRect.top + fRect.height / 2;
          const x2 = tRect.left - cRect.left;
          const y2 = tRect.top - cRect.top + tRect.height / 2;
          const dx = Math.max(28, (x2 - x1) / 2);
          const d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
          return { d, optional: !!e.optional, key: `${e.from}-${e.to}` };
        })
        .filter(Boolean);
      setPaths(next);
      setSvgSize({ w: container.scrollWidth, h: container.scrollHeight });
    }

    measure();
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length, JSON.stringify(nodes.map((n) => n.id))]);

  const hasOptional = nodes.some((n) => n.optional);

  return (
    <div className="diagram-wrap">
      <p className="sr-only">{describeDiagramForScreenReader(nodes, edges)}</p>
      <div className="diagram-graph" ref={containerRef} aria-hidden="true">
        <svg className="diagram-edges" width={svgSize.w} height={svgSize.h}>
          {paths.map((p) => (
            <path key={p.key} d={p.d} className={p.optional ? 'edge-optional' : 'edge-required'} />
          ))}
        </svg>
        <div className="diagram-columns">
          {columns.map((colIds, i) => (
            <div className="diagram-column" key={i}>
              {colIds.map((id) => {
                const node = byId[id];
                return (
                  <div
                    key={id}
                    ref={(el) => { nodeRefs.current[id] = el; }}
                    className={'d-node' + (node.entry ? ' entry' : '') + (node.optional ? ' optional' : '')}
                  >
                    <Icon tag={node.tag} size={20} />
                    <span className="d-tag">{node.tag}</span>
                    <span className="d-name">{node.name}</span>
                    {node.optional && <span className="d-optional-pill">optional</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {hasOptional && (
        <div className="diagram-legend">
          <span><i className="legend-swatch required" /> required path</span>
          <span><i className="legend-swatch optional" /> optional / worth considering</span>
        </div>
      )}
    </div>
  );
}
