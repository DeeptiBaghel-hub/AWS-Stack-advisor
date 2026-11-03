import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSequence from './LoadingSequence';
import api from '../api/axios';

const EXAMPLE = 'I want to build a food delivery app with 50k users, image uploads, PostgreSQL, and low cost.';

const DESCRIBE_STEPS = [
  'Reading your description',
  'Extracting requirements',
  'Matching workload patterns',
  'Drafting your architecture',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DescribeForm() {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const tooShort = description.trim().length > 0 && description.trim().length < 10;
  const tooLong = description.length > 1000;

  // This component unmounts not just on leaving /quiz entirely, but also
  // just from clicking the "Answer questions" tab — the mode-toggle
  // buttons stay visible and clickable the whole time this is submitting.
  // Without this guard, finishing a describe-mode submission after the
  // user switched away would still fire navigate('/results') and yank
  // them there, overriding a choice they'd already made to go elsewhere.
  //
  // The ref starts false and is set true INSIDE the effect body — React
  // 18 StrictMode double-invokes effects in development (mount, cleanup,
  // mount again) specifically to catch cleanup bugs, and a ref only ever
  // set false in cleanup with nothing to set it back true would end up
  // permanently stuck at false after that simulated cleanup.
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (description.trim().length < 10 || tooLong) return;

    setSubmitting(true);
    setError('');
    setStage(0);
    try {
      await sleep(400);
      if (!isMountedRef.current) return;
      setStage(1);
      const resultPromise = api.post('/recommend/from-description', { description });
      await sleep(700);
      if (!isMountedRef.current) return;
      setStage(2);
      await sleep(500);
      if (!isMountedRef.current) return;
      setStage(3);
      const res = await resultPromise;
      await sleep(350);
      if (!isMountedRef.current) return;

      const { extracted, description: sentDescription, ...recommendation } = res.data;
      navigate('/results', {
        state: { recommendation, answers: extracted, extracted, fromDescription: sentDescription },
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err.response?.data?.message || 'Could not reach the advisor. Is the API running?');
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      {submitting ? (
        <LoadingSequence stage={stage} steps={DESCRIBE_STEPS} heading="reading your project" />
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="q-tag">describe your project</div>
          <h2 className="q-title">What are you building?</h2>
          <p className="describe-hint">
            A sentence or two is enough — mention roughly how many users, any specific database
            or storage needs, and cost or scale concerns if you have them.
          </p>
          <textarea
            className="describe-textarea"
            placeholder={EXAMPLE}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={1000}
          />
          <div className="describe-footer">
            <span className={'describe-count' + (tooLong ? ' over' : '')}>
              {description.length}/1000
            </span>
            <button className="btn btn-primary" type="submit" disabled={tooShort || tooLong || !description.trim()}>
              get my recommendation &rarr;
            </button>
          </div>
          {tooShort && <p className="describe-warning">A little more detail helps — at least 10 characters.</p>}
          {error && <p className="form-error" style={{ marginTop: 16 }}>{error}</p>}
        </form>
      )}
    </div>
  );
}
