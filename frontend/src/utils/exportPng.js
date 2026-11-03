// Client-side diagram image exporter.
// Dynamically imports html2canvas so it is only loaded on-demand when the
// user clicks "export PNG", keeping the initial bundle light.

function slugify(title) {
  return (title || 'aws-architecture')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export async function exportDiagramPng(element, title = 'AWS Architecture') {
  if (!element) {
    throw new Error('Diagram element not found');
  }

  const html2canvasModule = await import('html2canvas');
  const html2canvas = html2canvasModule.default || html2canvasModule;

  // Determine active theme colors for background
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const bgColor = theme === 'light' ? '#F6F8FA' : '#0B131E';

  const canvas = await html2canvas(element, {
    backgroundColor: bgColor,
    scale: 2, // 2x resolution for sharp retina export
    logging: false,
    useCORS: true,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const dataUrl = canvas.toDataURL('image/png');
  const filename = `${slugify(title) || 'architecture'}-diagram.png`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

