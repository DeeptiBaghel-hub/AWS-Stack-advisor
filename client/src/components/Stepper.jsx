export default function Stepper({ questions, current }) {
  const fillPct = (current / (questions.length - 1)) * 100;

  return (
    <div className="stepper">
      <div className="stepper-track">
        <div className="stepper-fill" style={{ width: `${fillPct}%` }} />
      </div>
      <div className="stepper-nodes">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={'node' + (i < current ? ' done' : i === current ? ' active' : '')}
          />
        ))}
      </div>
      <div className="step-labels">
        {questions.map((q, i) => (
          <span key={q.id} className={i === current ? 'active' : ''} style={{ opacity: i === current ? 1 : 0.5 }}>
            {q.tag}
          </span>
        ))}
      </div>
    </div>
  );
}
