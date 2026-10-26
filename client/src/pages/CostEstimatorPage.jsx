import { useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { estimateMonthlyCost, guessIconTag, PRESETS } from '../utils/costEstimator';

function fmt(n) {
  return n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 2 : 0 });
}

export default function CostEstimatorPage() {
  const location = useLocation();
  const recommendation = location.state?.recommendation;

  const initialServices = recommendation
    ? recommendation.why.map((w) => w.name)
    : PRESETS.serverless.services;

  const [presetKey, setPresetKey] = useState(recommendation ? null : 'serverless');
  const [usersPerDay, setUsersPerDay] = useState(1000);
  const [actionsPerUser, setActionsPerUser] = useState(10);
  const [storageGB, setStorageGB] = useState(20);
  const [transferGB, setTransferGB] = useState(50);

  const services = presetKey ? PRESETS[presetKey].services : initialServices;
  const requestsPerMonth = usersPerDay * actionsPerUser * 30;

  const result = useMemo(
    () => estimateMonthlyCost(services, { requestsPerMonth, storageGB, transferGB }),
    [services, requestsPerMonth, storageGB, transferGB]
  );

  return (
    <div className="wrap">
      <div className="eyebrow">illustrative, not a quote</div>
      <h1>Estimate a rough monthly cost</h1>
      <p className="sub">
        Static, list-price-based math — no live AWS Pricing API call, so it's free to run and
        updates instantly as you move the sliders. Treat every number here as a ballpark, not a bill.
      </p>

      {recommendation ? (
        <p className="cost-source-note">
          Using the services from <b>{recommendation.title}</b>.{' '}
          <button className="link-btn" onClick={() => setPresetKey('serverless')}>Use a preset instead</button>
        </p>
      ) : (
        <div className="preset-pills">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              className={'pill' + (presetKey === key ? ' active' : '')}
              onClick={() => setPresetKey(key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="estimator-grid">
        <div className="card estimator-controls">
          <div className="slider-field">
            <div className="slider-label">
              <span id="users-per-day-label">Users per day</span>
              <span className="slider-value">{fmt(usersPerDay)}</span>
            </div>
            <input type="range" min="10" max="100000" step="10" value={usersPerDay}
              aria-labelledby="users-per-day-label" aria-valuetext={`${fmt(usersPerDay)} users per day`}
              onChange={(e) => setUsersPerDay(Number(e.target.value))} />
          </div>

          <div className="slider-field">
            <div className="slider-label">
              <span id="actions-per-user-label">Actions per user / day</span>
              <span className="slider-value">{fmt(actionsPerUser)}</span>
            </div>
            <input type="range" min="1" max="100" step="1" value={actionsPerUser}
              aria-labelledby="actions-per-user-label" aria-valuetext={`${fmt(actionsPerUser)} actions per user per day`}
              onChange={(e) => setActionsPerUser(Number(e.target.value))} />
          </div>

          <div className="slider-field">
            <div className="slider-label">
              <span id="storage-label">Storage (GB)</span>
              <span className="slider-value">{fmt(storageGB)} GB</span>
            </div>
            <input type="range" min="1" max="5000" step="1" value={storageGB}
              aria-labelledby="storage-label" aria-valuetext={`${fmt(storageGB)} gigabytes`}
              onChange={(e) => setStorageGB(Number(e.target.value))} />
          </div>

          <div className="slider-field">
            <div className="slider-label">
              <span id="transfer-label">Data transfer out (GB / month)</span>
              <span className="slider-value">{fmt(transferGB)} GB</span>
            </div>
            <input type="range" min="1" max="5000" step="1" value={transferGB}
              aria-labelledby="transfer-label" aria-valuetext={`${fmt(transferGB)} gigabytes per month`}
              onChange={(e) => setTransferGB(Number(e.target.value))} />
          </div>

          <p className="estimator-derived">≈ {fmt(requestsPerMonth)} requests/month</p>
        </div>

        <div className="card estimator-result">
          <div className="estimator-total">
            <span className="estimator-total-label">estimated total</span>
            <span className="estimator-total-value">${fmt(result.total)}<span>/mo</span></span>
          </div>
          <div className="estimator-lines">
            {result.lines.map((line) => (
              <div className="estimator-line" key={line.name}>
                <div className="estimator-line-name">
                  <Icon tag={guessIconTag(line.name)} size={16} />
                  <span>{line.name}</span>
                </div>
                <div className="estimator-line-right">
                  <span className="estimator-line-note">{line.note}</span>
                  <span className="estimator-line-cost">${fmt(line.cost)}</span>
                </div>
              </div>
            ))}
          </div>
          {result.unknownCount > 0 && (
            <p className="estimator-unknown">
              {result.unknownCount} service{result.unknownCount === 1 ? '' : 's'} in this stack
              {result.unknownCount === 1 ? " isn't" : " aren't"} modeled here — cost varies enough
              (or is flat enough) that a slider-driven estimate wouldn't be meaningful.
            </p>
          )}
        </div>
      </div>

      <div className="footnote" style={{ marginTop: 30 }}>
        <p style={{ margin: 0 }}>
          Rates are approximate US-East-1 on-demand list prices, not a live quote — real cost
          depends on region, reserved/spot pricing, free tier eligibility, and usage patterns this
          doesn't model. For an actual number, use the{' '}
          <a href="https://calculator.aws/" target="_blank" rel="noreferrer">AWS Pricing Calculator</a>.
        </p>
      </div>

      {!recommendation && (
        <p className="cost-cta">
          Want an estimate tailored to a real recommendation instead of a preset?{' '}
          <Link to="/quiz">Take the quiz</Link> and click "estimate cost" from your results.
        </p>
      )}
    </div>
  );
}
