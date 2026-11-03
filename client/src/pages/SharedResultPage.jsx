import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Diagram from '../components/Diagram';
import WhyCard from '../components/WhyCard';
import WellArchitectedReview from '../components/WellArchitectedReview';
import { exportRecommendationPdf } from '../utils/exportPdf';
import { exportRecommendationJson } from '../utils/exportJson';
import { exportDiagramPng } from '../utils/exportPng';
import { copyMermaidToClipboard } from '../utils/exportMermaid';
import api from '../api/axios';

export default function SharedResultPage() {
  const { shareId } = useParams();
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingPng, setExportingPng] = useState(false);
  const [copiedMermaid, setCopiedMermaid] = useState(false);
  const [error, setError] = useState('');
  const diagramRef = useRef(null);

  useEffect(() => {
    // Same protection as ComparePage: navigating between two different
    // share links is the same route with just a changed :shareId param,
    // and a slower first request resolving after a faster second one
    // would otherwise silently show the wrong shared recommendation.
    let ignore = false;
    setLoading(true);
    setError('');
    api
      .get(`/recommend/shared/${shareId}`)
      .then((res) => {
        if (!ignore) setRecommendation(res.data.recommendation);
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || 'Could not load this shared recommendation.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [shareId]);

  if (loading) {
    return (
      <div className="wrap">
        <p className="empty-state">Loading…</p>
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <div className="wrap">
        <p className="empty-state">
          {error || 'This link doesn\'t point to anything.'} <Link to="/quiz">Run your own quiz instead</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="shared-banner">
        Someone shared this AWS stack recommendation with you.{' '}
        <Link to="/quiz">Try the quiz yourself &rarr;</Link>
      </div>

      <div className="result-eyebrow">shared recommendation</div>
      <h2 className="result-title">{recommendation.title}</h2>

      <div ref={diagramRef} className="diagram-capture-target">
        <Diagram data={recommendation.diagram} />
      </div>

      <div className="why-grid">
        {recommendation.why.map((w, i) => (
          <WhyCard key={i} mark={w.mark} name={w.name} text={w.text} />
        ))}
      </div>

      <div className="footnote">
        {recommendation.footnotes.map((f, i) => (
          <p key={i} style={{ margin: '0 0 8px' }}>{f}</p>
        ))}
      </div>

      {recommendation.wellArchitected && (
        <WellArchitectedReview data={recommendation.wellArchitected} />
      )}

      <div className="btn-row" style={{ marginTop: 28 }}>
        <button
          className="btn"
          onClick={async () => {
            try {
              await exportRecommendationPdf(recommendation);
              toast.success('PDF downloaded.');
            } catch (err) {
              toast.error('Could not generate the PDF.');
            }
          }}
        >
          export as PDF
        </button>
        <button
          className="btn"
          onClick={() => {
            try {
              exportRecommendationJson(recommendation);
              toast.success('JSON downloaded.');
            } catch (err) {
              toast.error('Could not export the JSON.');
            }
          }}
        >
          export as JSON
        </button>
        <button
          className="btn"
          onClick={async () => {
            try {
              await copyMermaidToClipboard(recommendation.diagram, recommendation.title);
              setCopiedMermaid(true);
              toast.success('Mermaid diagram copied to clipboard.');
              setTimeout(() => setCopiedMermaid(false), 2500);
            } catch (err) {
              toast.error('Could not copy Mermaid syntax.');
            }
          }}
          title="Copy GitHub-compatible Mermaid flowchart syntax"
        >
          {copiedMermaid ? '✓ copied Mermaid' : 'copy Mermaid'}
        </button>
        <button
          className="btn"
          disabled={exportingPng}
          onClick={async () => {
            if (!diagramRef.current) return;
            setExportingPng(true);
            try {
              await exportDiagramPng(diagramRef.current, recommendation.title);
              toast.success('Diagram PNG downloaded.');
            } catch (err) {
              toast.error('Could not export diagram image.');
            } finally {
              setExportingPng(false);
            }
          }}
          title="Download high-resolution diagram image"
        >
          {exportingPng ? 'generating PNG…' : 'export diagram PNG'}
        </button>
        <Link to="/quiz" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
          take the quiz yourself &rarr;
        </Link>
      </div>
    </div>
  );
}
