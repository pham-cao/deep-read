import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth login
    window.location.href = 'http://localhost:8000/auth/google/login';
  };

  return (
    <div className="login-page" id="login-page">
      {/* Left Panel - Hero (70%) */}
      <div className="login-hero">
        <div className="login-hero-bg">
          <div className="login-hero-gradient" />
          <div className="login-hero-pattern" />
        </div>
        <div className="login-hero-content animate-fade-in-up">
          <div className="login-hero-badge">
            <span className="material-icons-outlined">architecture</span>
            <span>Fluid Architect AI</span>
          </div>
          <h1 className="login-hero-title">
            Architecture<br />
            <span className="login-hero-highlight">Redefined</span> by Intelligence.
          </h1>
          <p className="login-hero-desc">
            Design fluid, sustainable, and structurally superior environments with our advanced AI architectural partner.
          </p>
          <div className="login-hero-stats">
            <div className="login-hero-stat">
              <span className="login-hero-stat-value">1,200+</span>
              <span className="login-hero-stat-label">Projects Analyzed</span>
            </div>
            <div className="login-hero-stat">
              <span className="login-hero-stat-value">98%</span>
              <span className="login-hero-stat-label">Accuracy Rate</span>
            </div>
            <div className="login-hero-stat">
              <span className="login-hero-stat-value">24/7</span>
              <span className="login-hero-stat-label">AI Available</span>
            </div>
          </div>
        </div>
        <div className="login-hero-quote animate-fade-in">
          <span className="material-icons-outlined login-quote-icon">format_quote</span>
          <p>"The architect of the future will not just build spaces, but curate experiences through algorithmic precision."</p>
        </div>
      </div>

      {/* Right Panel - Login (30%) */}
      <div className="login-form-panel">
        <div className="login-form-container animate-slide-in-right">
          <div className="login-form-header">
            <span className="login-welcome-badge label-md">Welcome Back</span>
            <h2 className="login-form-title headline-md">Sign in</h2>
            <p className="login-form-subtitle body-md">
              Access your architectural workspace and projects.
            </p>
          </div>

          <button
            className="login-google-btn"
            id="google-login-btn"
            onClick={handleGoogleLogin}
          >
            <svg className="login-google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="login-divider">
            <span>or</span>
          </div>

          <form className="login-form" onSubmit={(e) => { e.preventDefault(); navigate('/chat'); }}>
            <div className="login-input-group">
              <label className="login-label label-md" htmlFor="email">Email</label>
              <div className="login-input-wrapper">
                <span className="material-icons-outlined login-input-icon">mail</span>
                <input
                  type="email"
                  id="email"
                  className="login-input"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div className="login-input-group">
              <label className="login-label label-md" htmlFor="password">Password</label>
              <div className="login-input-wrapper">
                <span className="material-icons-outlined login-input-icon">lock</span>
                <input
                  type="password"
                  id="password"
                  className="login-input"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button type="submit" className="login-submit-btn" id="login-submit-btn">
              Sign in
              <span className="material-icons-outlined">arrow_forward</span>
            </button>
          </form>

          <div className="login-footer">
            <a href="#" className="login-link body-sm">Privacy Policy</a>
            <span className="login-link-divider">•</span>
            <a href="#" className="login-link body-sm">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}
