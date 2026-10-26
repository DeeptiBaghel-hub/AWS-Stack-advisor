import { useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { generateTerraform } from '../utils/terraformGenerator';
import { PRESETS } from '../utils/costEstimator';

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function TerraformPage() {
  const location = useLocation();
  const recommendation = location.state?.recommendation;

  const initialServices = recommendation
    ? recommendation.why.map((w) => w.name)
    : PRESETS.serverless.services;
  const initialTitle = recommendation?.title || PRESETS.serverless.label;

  const [presetKey, setPresetKey] = useState(recommendation ? null : 'serverless');
  const [acknowledged, setAcknowledged] = useState(false);

  const services = presetKey ? PRESETS[presetKey].services : initialServices;
  const title = presetKey ? PRESETS[presetKey].label : initialTitle;

  const result = useMemo(() => generateTerraform(services, title), [services, title]);

  function handleDownload(filename) {
    downloadFile(filename, result.files[filename]);
    toast.success(`${filename} downloaded.`);
  }

  return (
    <div className="wrap">
      <div className="eyebrow">starter scaffold, not a deployment</div>
      <h1>Generate a Terraform starting point</h1>
      <p className="sub">
        Template-based, not AI-generated — every resource block below comes from a hand-written,
        reviewed template for that specific service. Complex or high-risk services (EKS, Redshift,
        SageMaker, and others) are explicitly declined rather than templated badly.
      </p>

      <div className="tf-danger-banner">
        <p className="tf-danger-title">Read this before you run anything</p>
        <ul>
          <li>This is a starting point for a design conversation, not a production deployment.</li>
          <li>Running <code>terraform apply</code> creates real AWS resources that cost real money.</li>
          <li>Always run <code>terraform plan</code> first and actually read the output.</li>
          <li>No VPC design, no least-privilege IAM beyond the bare minimum, no monitoring — see the generated README for the full list of what's deliberately left out.</li>
        </ul>
      </div>

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

      {result.unsupported.length > 0 && (
        <div className="tf-unsupported-note">
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
            {result.unsupported.length} service{result.unsupported.length === 1 ? '' : 's'} skipped —
            no reviewed template exists yet:
          </p>
          <ul>
            {result.unsupported.map((u) => (
              <li key={u.name}><b>{u.name}</b> — {u.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {result.supported.length === 0 ? (
        <p className="empty-state">
          None of these services have a reviewed Terraform template yet — nothing to generate.
        </p>
      ) : (
        <>
          <label className="tf-ack">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
            I understand this is a starting point that needs review, not something to apply directly.
          </label>

          <div className="tf-files">
            {Object.keys(result.files).map((filename) => (
              <div className="tf-file-card" key={filename}>
                <div className="tf-file-head">
                  <span className="tf-file-name">{filename}</span>
                  <button
                    className="btn"
                    disabled={!acknowledged}
                    onClick={() => handleDownload(filename)}
                  >
                    download
                  </button>
                </div>
                <pre className="tf-file-preview">{result.files[filename]}</pre>
              </div>
            ))}
          </div>
        </>
      )}

      {!recommendation && (
        <p className="cost-cta">
          Want a scaffold tailored to a real recommendation instead of a preset?{' '}
          <Link to="/quiz">Take the quiz</Link> and generate one from your results.
        </p>
      )}
    </div>
  );
}
