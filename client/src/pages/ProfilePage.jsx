import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  const [savedCount, setSavedCount] = useState(null);

  useEffect(() => {
    api
      .get('/recommend/history')
      .then((res) => setSavedCount(res.data.recommendations.length))
      .catch(() => setSavedCount(null));
  }, []);

  async function handleNameSave(e) {
    e.preventDefault();
    setNameError('');
    setNameSaving(true);
    try {
      await updateProfile({ name });
      toast.success('Profile updated.');
    } catch (err) {
      setNameError(err.response?.data?.message || 'Could not update your name.');
    } finally {
      setNameSaving(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    setPwError('');
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation don\'t match.');
      return;
    }
    setPwSaving(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      toast.success('Password changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err.response?.data?.message || 'Could not change your password.');
    } finally {
      setPwSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="wrap">
      <div className="eyebrow">account</div>
      <h1>Your profile</h1>
      <p className="sub">Personal info and account settings.</p>

      <div className="profile-summary card">
        <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
        <div className="profile-summary-info">
          <p className="profile-name">{user.name}</p>
          <p className="profile-email">{user.email}</p>
          <p className="profile-meta">
            Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
            {savedCount !== null && ` · ${savedCount} saved stack${savedCount === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      <div className="profile-section card">
        <h2 className="profile-section-title">Display name</h2>
        <form className="form" onSubmit={handleNameSave}>
          {nameError && <p className="form-error">{nameError}</p>}
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={nameSaving || name === user.name}>
            {nameSaving ? 'saving…' : 'save name'}
          </button>
        </form>
      </div>

      <div className="profile-section card">
        <h2 className="profile-section-title">Change password</h2>
        <form className="form" onSubmit={handlePasswordSave}>
          {pwError && <p className="form-error">{pwError}</p>}
          <div className="field">
            <label htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={pwSaving}>
            {pwSaving ? 'updating…' : 'update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
