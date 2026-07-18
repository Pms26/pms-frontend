'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Login Page (Reproduction Exacte du Style)
// ═══════════════════════════════════════════════════════════

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/AuthContext';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="login-screen">
      <div className="login-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      <div className="login-card glass-card text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiant ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="loginScreen" className="login-screen">
      {/* Background shapes for float animation */}
      <div className="login-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Login glass card */}
      <div className="login-card glass-card">
        <div className="login-logo mb-4">
          <div className="logo-icon">
            <i className="bi bi-building text-white" />
          </div>
          <div>
            <h1 className="login-title">OASIS PMS</h1>
            <p className="login-subtitle">Property Management System</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3 mb-3 text-xs" style={{ fontSize: '0.8rem', borderRadius: '8px' }}>
            <i className="bi bi-exclamation-triangle-fill me-2" />
            {error}
          </div>
        )}

        <form id="loginForm" onSubmit={handleSubmit} className="mt-2">
          {/* Floating User Input */}
          <div className="form-floating mb-3">
            <input
              type="text"
              className="form-control pms-input"
              id="loginUser"
              placeholder="Identifiant"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <label htmlFor="loginUser">
              <i className="bi bi-person me-2" />
              Identifiant
            </label>
          </div>

          {/* Floating Password Input */}
          <div className="form-floating mb-3 position-relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control pms-input"
              id="loginPass"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <label htmlFor="loginPass">
              <i className="bi bi-lock me-2" />
              Mot de passe
            </label>
            <span 
              className="pass-toggle" 
              onClick={() => setShowPassword(!showPassword)}
            >
              <i id="eyeIcon" className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
            </span>
          </div>

          <a href="#" className="forgot-link d-block text-end mb-4">
            Mot de passe oublié ?
          </a>

          <button 
            id="loginBtn"
            type="submit" 
            className="btn btn-pms w-100 py-3" 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Connexion en cours...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-right-circle me-2" />
                Se connecter
              </>
            )}
          </button>

          {/* Biometrics */}
          <div className="biometric-row mt-4">
            <button type="button" className="btn-bio" title="Touch ID">
              <i className="bi bi-fingerprint" />
              <span>Touch ID</span>
            </button>
            <button type="button" className="btn-bio" title="Face ID">
              <i className="bi bi-person-bounding-box" />
              <span>Face ID</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
