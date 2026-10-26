import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Diagram from '../components/Diagram';
import WhyCard from '../components/WhyCard';
import WellArchitectedReview from '../components/WellArchitectedReview';
import api from '../api/axios';

export default function SharedResultPage() {
  const { shareId } = useParams();
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      <Diagram data={recommendation.diagram} />

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
    </div>
  );
}
