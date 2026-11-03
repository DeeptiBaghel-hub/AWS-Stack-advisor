// Converts the recommendation DAG into clean GitHub-flavored Mermaid.js syntax.
// Can be copied directly into GitHub READMEs, Notion, Jira, ADRs, or Mermaid Live Editor.

function slugify(title) {
  return (title || 'aws-architecture')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export function generateMermaid(diagram, title = 'AWS Architecture') {
  if (!diagram || !Array.isArray(diagram.nodes) || diagram.nodes.length === 0) {
    return '```mermaid\nflowchart LR\n    empty["No nodes in architecture"]\n```';
  }

  const lines = [
    '```mermaid',
    'flowchart LR',
    `    %% Architecture: ${title.replace(/[\r\n]+/g, ' ')}`,
    '    classDef entry fill:#2A3B4C,stroke:#57D9C6,stroke-width:2px,color:#fff;',
    '    classDef compute fill:#1E293B,stroke:#38BDF8,stroke-width:2px,color:#fff;',
    '    classDef database fill:#1E293B,stroke:#F59E0B,stroke-width:2px,color:#fff;',
    '    classDef storage fill:#1E293B,stroke:#10B981,stroke-width:2px,color:#fff;',
    '    classDef defaultNode fill:#1E293B,stroke:#94A3B8,stroke-width:1.5px,color:#fff;',
  ];

  // Nodes
  diagram.nodes.forEach((n) => {
    const safeName = (n.name || n.id).replace(/"/g, "'");
    const tag = n.tag ? `\\n[${n.tag}]` : '';
    const optional = n.optional ? ' (optional)' : '';
    lines.push(`    n_${n.id}["${safeName}${optional}${tag}"]`);

    if (n.entry) {
      lines.push(`    class n_${n.id} entry;`);
    } else if (n.tag && ['compute', 'database', 'storage'].includes(n.tag)) {
      lines.push(`    class n_${n.id} ${n.tag};`);
    } else {
      lines.push(`    class n_${n.id} defaultNode;`);
    }
  });

  // Edges
  (diagram.edges || []).forEach((e) => {
    if (e.optional) {
      lines.push(`    n_${e.from} -. "optional" .-> n_${e.to}`);
    } else {
      lines.push(`    n_${e.from} --> n_${e.to}`);
    }
  });

  lines.push('```');
  return lines.join('\n');
}

export async function copyMermaidToClipboard(diagram, title) {
  const code = generateMermaid(diagram, title);
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(code);
  } else {
    // Fallback for older environments
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  return code;
}

