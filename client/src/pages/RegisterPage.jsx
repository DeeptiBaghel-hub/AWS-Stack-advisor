import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(name, email, password);
      toast.success('Account created.');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wrap">
      <div className="eyebrow">account</div>
      <h1>Create an account</h1>
      <form className="form" onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'creating account…' : 'create account'}
        </button>
        <p className="form-hint">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
