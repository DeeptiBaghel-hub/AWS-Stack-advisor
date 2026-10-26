import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage';
import ServicesPage from './pages/ServicesPage';
import ComparePage from './pages/ComparePage';
import CostEstimatorPage from './pages/CostEstimatorPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HistoryPage from './pages/HistoryPage';
import HistoryComparePage from './pages/HistoryComparePage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import SharedResultPage from './pages/SharedResultPage';
import HowItWorksPage from './pages/HowItWorksPage';
import TerraformPage from './pages/TerraformPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const location = useLocation();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Keyed on location.key so navigating here from itself (e.g.
            clicking the navbar's "quiz" link while already mid-quiz)
            forces a real remount instead of silently reusing stale
            component state — QuizPage reads location.state (for the
            "tweak a saved stack" flow) only on initial mount, and
            React Router doesn't remount same-path navigations by
            default. Without this, clicking "quiz" while tweaking did
            nothing visible: the tweak banner and stepper progress just
            stayed exactly as they were. */}
        <Route path="/quiz" element={<QuizPage key={location.key} />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/compare" element={<ComparePage />} />
        {/* Same class of bug as /quiz above: presetKey's initial value is
            derived from location.state?.recommendation once at mount, so
            navigating here from a recommendation-backed visit to a plain
            nav-link visit (no state) left the preset picker showing no
            active pill even though it had silently fallen back to the
            serverless preset's data underneath. */}
        <Route path="/cost-estimator" element={<CostEstimatorPage key={location.key} />} />
        <Route path="/shared/:shareId" element={<SharedResultPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/terraform" element={<TerraformPage key={location.key} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history/compare"
          element={
            <ProtectedRoute>
              <HistoryComparePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ChatWidget />
      <Toaster
        position="bottom-left"
        toastOptions={{
          duration: 3200,
          style: {
            background: 'var(--panel)',
            color: 'var(--text)',
            border: '1px solid var(--border-strong)',
            fontFamily: 'var(--font-body)',
            fontSize: '13.5px',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#57D9C6', secondary: '#0D1D2C' } },
          error: { iconTheme: { primary: '#FF6B6B', secondary: '#0D1D2C' } },
        }}
      />
    </>
  );
}
