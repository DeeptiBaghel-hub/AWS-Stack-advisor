import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">stack advisor</Link>
        <div className="nav-links">
          <Link to="/quiz">quiz</Link>
          <Link to="/services">services</Link>
          <Link to="/compare">compare</Link>
          <Link to="/cost-estimator">cost</Link>
          {user ? (
            <>
              <Link to="/dashboard">dashboard</Link>
              <Link to="/history">history</Link>
              <Link to="/profile" className="user-tag">{user.name}</Link>
              <button onClick={handleLogout}>sign out</button>
            </>
          ) : (
            <>
              <Link to="/login">sign in</Link>
              <Link to="/register">sign up</Link>
            </>
          )}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>
    </div>
  );
}
