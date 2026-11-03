import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Diagram from '../components/Diagram';
import WhyCard from '../components/WhyCard';
import WellArchitectedReview from '../components/WellArchitectedReview';
import { exportRecommendationPdf } from '../utils/exportPdf';
import { exportRecommendationJson } from '../utils/exportJson';
import api from '../api/axios';

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/recommend/history')
      .then((res) => setItems(res.data.recommendations))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your history.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    try {
      await api.delete(`/recommend/history/${id}`);
      setItems((prev) => prev.filter((i) => i._id !== id));
      setSelected((prev) => prev.filter((sid) => sid !== id));
      toast.success('Deleted.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete this item.');
    }
  }

  async function handleExportPdf(item) {
    try {
      await exportRecommendationPdf(item);
      toast.success('PDF downloaded.');
    } catch (err) {
      toast.error('Could not generate the PDF.');
    }
  }

  function handleExportJson(item) {
    try {
      exportRecommendationJson(item);
      toast.success('JSON downloaded.');
    } catch (err) {
      toast.error('Could not export the JSON.');
    }
  }

  async function handleShare(item) {
    const url = `${window.location.origin}/shared/${item.shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied.');
    } catch (err) {
      toast.error('Could not copy the link — here it is: ' + url);
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((sid) => sid !== id);
      if (prev.length >= 2) return prev; // cap at 2 — comparing more than two at once gets unreadable fast
      return [...prev, id];
    });
  }

  function handleCompare() {
    const [idA, idB] = selected;
    const recA = items.find((i) => i._id === idA);
    const recB = items.find((i) => i._id === idB);
    navigate('/history/compare', { state: { recA, recB } });
  }

  function handleTweak(item) {
    navigate('/quiz', { state: { prefillAnswers: item.answers || {}, prefillTitle: item.title } });
  }

  return (
    <div className="wrap">
      <div className="eyebrow">saved results</div>
      <h1>Your history</h1>
      <p className="sub">
        Every stack you've saved from the quiz, most recent first.
        {items.length >= 2 && ' Select two to compare them head-to-head.'}
      </p>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="empty-state">Loading…</p>}

      {!loading && items.length === 0 && (
        <p className="empty-state">
          Nothing saved yet. <Link to="/">Take the quiz</Link> and save a result to see it here.
        </p>
      )}

      {items.map((item) => {
        const isSelected = selected.includes(item._id);
        const selectionDisabled = !isSelected && selected.length >= 2;
        return (
          <div key={item._id}>
            <div className={'history-item' + (isSelected ? ' history-item-selected' : '')}>
              <label className="h-select" title={selectionDisabled ? 'Deselect one to pick a different pair' : 'Select to compare'}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={selectionDisabled}
                  onChange={() => toggleSelect(item._id)}
                />
              </label>
              <div>
                <p className="h-title">{item.title}</p>
                <span className="h-date">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <div className="h-actions">
                <button className="btn" onClick={() => setOpenId(openId === item._id ? null : item._id)}>
                  {openId === item._id ? 'hide' : 'view'}
                </button>
                <button className="btn" onClick={() => handleTweak(item)}>tweak</button>
                <button className="btn" onClick={() => handleShare(item)}>share</button>
                <button className="btn" onClick={() => handleExportPdf(item)}>PDF</button>
                <button className="btn" onClick={() => handleExportJson(item)}>JSON</button>
                <button className="btn" onClick={() => handleDelete(item._id)}>delete</button>
              </div>
            </div>
            {openId === item._id && (
              <div className="card" style={{ marginBottom: 14 }}>
                <Diagram data={item.diagram} />
                <div className="why-grid">
                  {item.why.map((w, i) => (
                    <WhyCard key={i} mark={w.mark} name={w.name} text={w.text} />
                  ))}
                </div>
                {item.wellArchitected && <WellArchitectedReview data={item.wellArchitected} />}
              </div>
            )}
          </div>
        );
      })}

      {selected.length === 2 && (
        <div className="compare-bar">
          <span>2 selected</span>
          <button className="btn btn-primary" onClick={handleCompare}>compare these &rarr;</button>
        </div>
      )}
    </div>
  );
}
