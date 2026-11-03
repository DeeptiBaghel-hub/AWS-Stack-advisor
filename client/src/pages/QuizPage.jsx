import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Stepper from '../components/Stepper';
import LoadingSequence from '../components/LoadingSequence';
import DescribeForm from '../components/DescribeForm';
import questions from '../questions';
import { QUIZ_PRESETS, parseQuizParams, buildQuizShareUrl } from '../utils/quizPresets';
import api from '../api/axios';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function QuizPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { prefillAnswers, prefillTitle } = location.state || {};
  const urlConfig = useRef(parseQuizParams(searchParams)).current;

  const initialAnswers = prefillAnswers || (Object.keys(urlConfig.answers).length > 0 ? urlConfig.answers : {});
  const initialPresetKey = urlConfig.presetKey || null;
  const initialTitle = prefillTitle || urlConfig.presetLabel || (initialPresetKey ? QUIZ_PRESETS[initialPresetKey]?.label : '');

  const [mode, setMode] = useState('quiz'); // 'quiz' | 'describe'
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [activePreset, setActivePreset] = useState(initialPresetKey);
  const [scenarioTitle, setScenarioTitle] = useState(initialTitle);
  const [tweaking, setTweaking] = useState(Boolean(initialTitle));
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const question = questions[current];

  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function executeRecommendation(finalAnswers, tweakLabel) {
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
      const resultPromise = api.post('/recommend', { answers: finalAnswers });
      await sleep(600);
      if (!isMountedRef.current) return;
      setStage(3);
      const res = await resultPromise;
      await sleep(350);
      if (!isMountedRef.current) return;
      navigate('/results', {
        state: {
          recommendation: res.data,
          answers: finalAnswers,
          tweakedFrom: tweakLabel || undefined,
        },
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err.response?.data?.message || 'Could not reach the advisor. Is the API running?');
      setSubmitting(false);
    }
  }

  // Handle auto-submission when all questions are answered and ?auto=true or ?run=true
  useEffect(() => {
    if (urlConfig.autoSubmit && urlConfig.isComplete) {
      executeRecommendation(urlConfig.answers, urlConfig.presetLabel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startFresh() {
    setAnswers({});
    setTweaking(false);
    setActivePreset(null);
    setScenarioTitle('');
    setCurrent(0);
  }

  function handleSelectPreset(preset) {
    setAnswers({ ...preset.answers });
    setActivePreset(preset.id);
    setScenarioTitle(preset.label);
    setTweaking(true);
    setCurrent(0);
    toast.success(`Loaded "${preset.label}" scenario. Ready to customize or run!`);
  }

  async function handleCopyScenarioLink() {
    try {
      const url = buildQuizShareUrl(answers, false, window.location.origin);
      await navigator.clipboard.writeText(url);
      toast.success('Shareable scenario link copied to clipboard!');
    } catch {
      toast.error('Could not copy link to clipboard.');
    }
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

    await executeRecommendation(next, tweaking ? scenarioTitle : undefined);
  }

  return (
    <div className="wrap">
      <div className="eyebrow">schematic / v1</div>
      <h1>Let's map your stack</h1>
      <p className="sub">
        Answer five quick questions, or describe your project in your own words — either way you
        get a suggested AWS architecture with reasoning.
      </p>

      {mode === 'quiz' && !submitting && (
        <div className="quiz-presets-bar">
          <div className="quiz-presets-header">
            <span className="quiz-presets-label">⚡ Architecture Scenarios &amp; Presets:</span>
            <button
              className="copy-link-btn"
              onClick={handleCopyScenarioLink}
              title="Copy a shareable link that opens with these exact parameters"
            >
              📋 copy scenario link
            </button>
          </div>
          <div className="quiz-presets-chips">
            {Object.values(QUIZ_PRESETS).map((p) => (
              <button
                key={p.id}
                className={'preset-chip' + (activePreset === p.id ? ' active' : '')}
                onClick={() => handleSelectPreset(p)}
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {tweaking && mode === 'quiz' && !submitting && (
        <div className="tweak-banner">
          <span>
            Starting from <b>{scenarioTitle}</b> — your answers are pre-filled below.
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
