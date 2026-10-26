import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Diagram from '../components/Diagram';
import WhyCard from '../components/WhyCard';
import WellArchitectedReview from '../components/WellArchitectedReview';
import { useAuth } from '../context/AuthContext';
import { exportRecommendationPdf } from '../utils/exportPdf';
import { exportRecommendationJson } from '../utils/exportJson';
import { describeExtractedAnswers } from '../utils/answerLabels';
import api from '../api/axios';

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { recommendation, answers, extracted, fromDescription, tweakedFrom } = location.state || {};

  if (!recommendation) {
    return (
      <div className="wrap">
        <p className="empty-state">
          No recommendation to show yet. <Link to="/quiz">Take the quiz</Link> first.
        </p>
      </div>
    );
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.post('/recommend/history', { answers, ...recommendation });
      setSaved(true);
      toast.success('Saved to your history.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this result.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    try {
      await exportRecommendationPdf(recommendation);
      toast.success('PDF downloaded.');
    } catch (err) {
      toast.error('Could not generate the PDF.');
    }
  }

  function handleExportJson() {
    try {
      exportRecommendationJson(recommendation);
      toast.success('JSON downloaded.');
    } catch (err) {
      toast.error('Could not export the JSON.');
    }
  }

  return (
    <div className="wrap">
      {fromDescription && (
        <div className="extracted-banner">
          <p className="extracted-banner-title">Based on your description, here's what we understood:</p>
          <p className="extracted-banner-source">&ldquo;{fromDescription}&rdquo;</p>
          <div className="extracted-chips">
            {describeExtractedAnswers(extracted).map((a) => (
              <span className="extracted-chip" key={a.id}>{a.label}</span>
            ))}
          </div>
          <p className="extracted-banner-hint">
            Doesn't look right? <Link to="/quiz">Answer the questions manually instead</Link>.
          </p>
        </div>
      )}

      {tweakedFrom && (
        <div className="tweak-result-banner">
          Tweaked from <b>{tweakedFrom}</b>. Save this one too, then compare them in{' '}
          <Link to="/history">your history</Link> to see exactly what changed.
        </div>
      )}

      <div className="result-eyebrow">recommended stack</div>
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

      {error && <p className="form-error" style={{ marginTop: 20 }}>{error}</p>}

      <div className="btn-row">
        <button className="btn" onClick={() => navigate('/quiz')}>&larr; start over</button>
        <button className="btn" onClick={handleExportPdf}>export as PDF</button>
        <button className="btn" onClick={handleExportJson}>export as JSON</button>
        {user ? (
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || saved}>
            {saved ? 'saved to history' : saving ? 'saving…' : 'save to my history'}
          </button>
        ) : (
          <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
            sign in to save this
          </Link>
        )}
      </div>

      <div className="keep-exploring">
        <p className="q-tag" style={{ marginBottom: 12 }}>keep exploring</p>
        <div className="keep-exploring-links">
          <Link to="/services" className="keep-exploring-link">
            <span>Look up any service recommended above in the full catalog</span>
            <span className="arrow">&rarr;</span>
          </Link>
          <Link to="/compare" className="keep-exploring-link">
            <span>Not sure why this over an alternative? Compare it head-to-head</span>
            <span className="arrow">&rarr;</span>
          </Link>
          <Link to="/cost-estimator" state={{ recommendation }} className="keep-exploring-link">
            <span>Get a rough monthly cost estimate for this exact stack</span>
            <span className="arrow">&rarr;</span>
          </Link>
          <Link to="/terraform" state={{ recommendation }} className="keep-exploring-link">
            <span>Generate a Terraform starting point (needs your review before applying)</span>
            <span className="arrow">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
