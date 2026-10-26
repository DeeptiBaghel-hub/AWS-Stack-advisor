import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Stepper from '../components/Stepper';
import LoadingSequence from '../components/LoadingSequence';
import DescribeForm from '../components/DescribeForm';
import questions from '../questions';
import api from '../api/axios';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function QuizPage() {
  const location = useLocation();
  const { prefillAnswers, prefillTitle } = location.state || {};

  const [mode, setMode] = useState('quiz'); // 'quiz' | 'describe'
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(prefillAnswers || {});
  const [tweaking, setTweaking] = useState(Boolean(prefillTitle));
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const question = questions[current];

  // The submission sequence below is a multi-second chain of awaited
  // sleeps (for the staged loading animation) before the final navigate()
  // call. If the user clicks away to a different in-app page partway
  // through — a completely ordinary thing to do — the component
  // unmounts, but this async function keeps running to completion
  // regardless, and navigate() doesn't care whether its caller is still
  // mounted. Without this guard, that meant getting yanked back to
  // /results a couple seconds after intentionally navigating somewhere
  // else, silently overriding a real navigation choice.
  //
  // The ref starts false and is set true INSIDE the effect body, not just
  // via useRef's initial value — React 18 StrictMode double-invokes
  // effects in development (mount, cleanup, mount again) specifically to
  // catch cleanup bugs, and a ref that only ever gets set false in
  // cleanup with nothing to set it back true would end up permanently
  // stuck at false after that simulated cleanup, silently blocking every
  // guarded step for the rest of the component's real lifetime.
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function startFresh() {
    setAnswers({});
    setTweaking(false);
    setCurrent(0);
  }

  async function selectOption(value) {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);

    if (current < questions.length - 1) {
      setTimeout(() => {
        if (isMountedRef.current) setCurrent((c) => c + 1);
      }, 180);
      return;
    }

    setSubmitting(true);
    setError('');
    setStage(0);
    try {
      await sleep(450);
      if (!isMountedRef.current) return;
      setStage(1);
      await sleep(550);
      if (!isMountedRef.current) return;
      setStage(2);
      const resultPromise = api.post('/recommend', { answers: next });
      await sleep(600);
      if (!isMountedRef.current) return;
      setStage(3);
      const res = await resultPromise;
      await sleep(350);
      if (!isMountedRef.current) return;
      navigate('/results', {
        state: { recommendation: res.data, answers: next, tweakedFrom: tweaking ? prefillTitle : undefined },
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err.response?.data?.message || 'Could not reach the advisor. Is the API running?');
      setSubmitting(false);
    }
  }

  return (
    <div className="wrap">
      <div className="eyebrow">schematic / v1</div>
      <h1>Let's map your stack</h1>
      <p className="sub">
        Answer five quick questions, or describe your project in your own words — either way you
        get a suggested AWS architecture with reasoning.
      </p>

      {tweaking && mode === 'quiz' && !submitting && (
        <div className="tweak-banner">
          <span>
            Starting from <b>{prefillTitle}</b> — your previous answers are pre-filled below.
            Change any question to see how the recommendation shifts.
          </span>
          <button className="btn" onClick={startFresh}>start fresh instead</button>
        </div>
      )}

      <div className="mode-toggle" role="tablist" aria-label="How to provide your requirements">
        <button
          role="tab"
          aria-selected={mode === 'quiz'}
          className={'mode-tab' + (mode === 'quiz' ? ' active' : '')}
          onClick={() => setMode('quiz')}
        >
          Answer questions
        </button>
        <button
          role="tab"
          aria-selected={mode === 'describe'}
          className={'mode-tab' + (mode === 'describe' ? ' active' : '')}
          onClick={() => setMode('describe')}
        >
          Describe it in words
        </button>
      </div>

      {mode === 'quiz' ? (
        <>
          <Stepper questions={questions} current={current} />

          <div className="card">
            {submitting ? (
              <LoadingSequence stage={stage} />
            ) : (
              <>
                <div className="q-tag">
                  question <b>{current + 1}</b> of {questions.length}
                </div>
                <h2 className="q-title">{question.title}</h2>
                <div className="options">
                  {question.options.map((opt) => (
                    <button
                      key={opt.v}
                      className={'opt' + (answers[question.id] === opt.v ? ' selected' : '')}
                      onClick={() => selectOption(opt.v)}
                    >
                      <span className="opt-label">{opt.label}</span>
                      <span className="opt-desc">{opt.desc}</span>
                    </button>
                  ))}
                </div>
                {error && <p className="form-error" style={{ marginTop: 20 }}>{error}</p>}
                <div className="nav-row">
                  <button className="back-link" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
                    &larr; back
                  </button>
                  <span className="progress-txt">
                    {Math.round((current / questions.length) * 100)}% mapped
                  </span>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <DescribeForm />
      )}
    </div>
  );
}
